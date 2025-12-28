/**
 * One Word - Experiment Runner
 *
 * Orchestrates experiment execution with progress tracking, error handling,
 * and result aggregation
 */

import type {
  Experiment,
  ExperimentConfig,
  Sample,
  RunProgress,
  ExperimentResults,
  WordFrequency,
  ModelResult,
  SampleParams,
} from './types';
import { providers, PROVIDER_DATA } from './providers';
import { storage } from './storage';
import { autoSubmitExperiment } from './community';

// ==================== Progress Tracking ====================

interface RunningExperiment {
  experiment: Experiment;
  abortController: AbortController;
  progress: RunProgress;
  samples: Sample[];
  startTime: number;
}

// ==================== Experiment Runner ====================

export class ExperimentRunner {
  private runningExperiments = new Map<string, RunningExperiment>();

  async start(experiment: Experiment, apiKeys: Record<string, string>): Promise<void> {
    if (this.runningExperiments.has(experiment.id)) {
      throw new Error('Experiment is already running');
    }

    // Validate we have keys for all required providers
    const requiredProviders = new Set<string>();
    experiment.selectedModels.forEach(modelId => {
      const model = this.findModelById(modelId);
      if (model) {
        requiredProviders.add(model.providerId);
      }
    });

    const missingKeys = Array.from(requiredProviders).filter(
      providerId => !apiKeys[providerId]
    );

    if (missingKeys.length > 0) {
      throw new Error(`Missing API keys for: ${missingKeys.join(', ')}`);
    }

    const abortController = new AbortController();

    const runningExperiment: RunningExperiment = {
      experiment,
      abortController,
      progress: {
        totalCalls: experiment.totalCalls,
        completedCalls: 0,
        currentModel: '',
        currentConfig: { temperature: 0, topK: 0 },
        estimatedTimeRemaining: 0,
        runningCost: 0,
        recentWords: [],
      },
      samples: [],
      startTime: Date.now(),
    };

    this.runningExperiments.set(experiment.id, runningExperiment);

    // Update experiment status
    experiment.status = 'running';
    experiment.startedAt = new Date().toISOString();
    await storage.saveExperiment(experiment);

    // Start execution
    this.executeExperiment(runningExperiment, apiKeys).catch(error => {
      console.error('Experiment execution error:', error);
      this.handleError(experiment.id, error);
    });
  }

  private async executeExperiment(
    runningExperiment: RunningExperiment,
    apiKeys: Record<string, string>
  ): Promise<void> {
    const { experiment, abortController, progress } = runningExperiment;

    try {
      for (const modelId of experiment.selectedModels) {
        if (abortController.signal.aborted) break;

        const model = this.findModelById(modelId);
        if (!model) {
          console.error(`Model not found: ${modelId}`);
          continue;
        }

        const apiKey = apiKeys[model.providerId];
        if (!apiKey) {
          console.error(`No API key for provider: ${model.providerId}`);
          continue;
        }

        progress.currentModel = model.name;

        for (const config of experiment.configs) {
          if (abortController.signal.aborted) break;

          progress.currentConfig = config;

          // Execute samples for this model+config combination
          await this.executeSamplesForConfig(
            runningExperiment,
            model.providerId,
            modelId,
            config,
            apiKey
          );
        }
      }

      if (!abortController.signal.aborted) {
        await this.completeExperiment(experiment.id);
      }
    } catch (error) {
      this.handleError(experiment.id, error);
    }
  }

  private async executeSamplesForConfig(
    runningExperiment: RunningExperiment,
    providerId: string,
    modelId: string,
    config: ExperimentConfig,
    apiKey: string
  ): Promise<void> {
    const { experiment, abortController, progress } = runningExperiment;

    for (let i = 0; i < experiment.samplesPerConfig; i++) {
      if (abortController.signal.aborted) break;

      try {
        const sampleParams: SampleParams = {
          model: modelId,
          stimulus: experiment.stimulus,
          temperature: config.temperature,
          topK: config.topK,
          maxTokens: 5,
        };

        console.log(`[RUNNER] Sampling ${modelId} with temp=${config.temperature}, topK=${config.topK}`);
        const startTime = Date.now();
        const word = await providers.sample(providerId, sampleParams, apiKey);
        const latencyMs = Date.now() - startTime;
        console.log(`[RUNNER] Got word: "${word}" in ${latencyMs}ms`);

        // Estimate cost (rough approximation)
        const cost = providers.estimateCost(providerId, {
          model: modelId,
          inputTokens: Math.ceil(experiment.stimulus.length / 4), // Rough token estimate
          outputTokens: 1, // One word output
        });

        const sample: Sample = {
          id: `${experiment.id}-${modelId}-${i}-${Date.now()}`,
          experimentId: experiment.id,
          modelId,
          temperature: config.temperature,
          topK: config.topK,
          word,
          latencyMs,
          cost,
          timestamp: new Date().toISOString(),
        };

        // Save sample
        await storage.saveSample(sample);
        runningExperiment.samples.push(sample);

        // Update progress
        progress.completedCalls++;
        progress.runningCost += cost;
        progress.recentWords = [word, ...progress.recentWords.slice(0, 9)]; // Keep last 10 words

        // Estimate time remaining
        const elapsed = Date.now() - runningExperiment.startTime;
        const rate = progress.completedCalls / elapsed; // calls per ms
        const remaining = progress.totalCalls - progress.completedCalls;
        progress.estimatedTimeRemaining = remaining / rate;

        // Notify progress (could emit event here)
        this.onProgressUpdate(experiment.id, { ...progress });

        // Brief pause to prevent overwhelming the APIs
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`[RUNNER] Sample failed for ${modelId}:`, error);
        // Log more details about the error
        if (error instanceof Error) {
          console.error(`[RUNNER] Error message: ${error.message}`);
        }
        // Continue with other samples - don't fail the whole experiment for one bad sample
      }
    }
  }

  private async completeExperiment(experimentId: string): Promise<void> {
    const runningExperiment = this.runningExperiments.get(experimentId);
    if (!runningExperiment) return;

    const { experiment, samples } = runningExperiment;

    // Update experiment status
    experiment.status = 'completed';
    experiment.completedAt = new Date().toISOString();
    experiment.actualCost = samples.reduce((sum, sample) => sum + sample.cost, 0);
    experiment.progress = 100;

    await storage.saveExperiment(experiment);

    // Generate and save results
    const results = this.generateResults(experiment, samples);
    await storage.saveResults(results);

    // Auto-submit to community (anonymous, no API keys)
    autoSubmitExperiment(experiment, results).catch(err => {
      console.error('[RUNNER] Community submission failed:', err);
    });

    // Clean up
    this.runningExperiments.delete(experimentId);

    console.log(`Experiment ${experimentId} completed successfully`);
  }

  private async handleError(experimentId: string, error: unknown): Promise<void> {
    console.error(`Experiment ${experimentId} failed:`, error);

    const runningExperiment = this.runningExperiments.get(experimentId);
    if (runningExperiment) {
      const { experiment, samples } = runningExperiment;

      // Update experiment status
      experiment.status = 'failed';
      experiment.completedAt = new Date().toISOString();
      experiment.actualCost = samples.reduce((sum, sample) => sum + sample.cost, 0);

      await storage.saveExperiment(experiment);

      // Save partial results if we have any samples
      if (samples.length > 0) {
        const results = this.generateResults(experiment, samples);
        await storage.saveResults(results);
      }

      // Clean up
      this.runningExperiments.delete(experimentId);
    }
  }

  private generateResults(experiment: Experiment, samples: Sample[]): ExperimentResults {
    // Aggregate word frequencies
    const wordCounts = new Map<string, number>();
    samples.forEach(sample => {
      const count = wordCounts.get(sample.word) || 0;
      wordCounts.set(sample.word, count + 1);
    });

    const totalSamples = samples.length;
    const uniqueWords = wordCounts.size;

    // Convert to frequency objects
    const topWords: WordFrequency[] = Array.from(wordCounts.entries())
      .map(([word, count]) => ({
        word,
        count,
        percentage: (count / totalSamples) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate entropy (diversity measure)
    const entropy = -topWords.reduce((sum, { percentage }) => {
      const p = percentage / 100;
      return sum + (p > 0 ? p * Math.log2(p) : 0);
    }, 0);

    // Group by model
    const byModel: ModelResult[] = [];
    const modelGroups = new Map<string, Sample[]>();

    samples.forEach(sample => {
      const key = sample.modelId;
      if (!modelGroups.has(key)) {
        modelGroups.set(key, []);
      }
      modelGroups.get(key)!.push(sample);
    });

    modelGroups.forEach((modelSamples, modelId) => {
      const modelWordCounts = new Map<string, number>();
      modelSamples.forEach(sample => {
        const count = modelWordCounts.get(sample.word) || 0;
        modelWordCounts.set(sample.word, count + 1);
      });

      const modelWords: WordFrequency[] = Array.from(modelWordCounts.entries())
        .map(([word, count]) => ({
          word,
          count,
          percentage: (count / modelSamples.length) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      // Find the config used for this model (assuming single config for simplicity)
      const sampleConfig = modelSamples[0];
      const config: ExperimentConfig = {
        temperature: sampleConfig.temperature,
        topK: sampleConfig.topK,
      };

      byModel.push({
        modelId,
        config,
        words: modelWords,
        totalSamples: modelSamples.length,
        uniqueWords: modelWordCounts.size,
      });
    });

    // Group by temperature
    const byTemperature: Record<number, WordFrequency[]> = {};
    const tempGroups = new Map<number, Sample[]>();

    samples.forEach(sample => {
      const temp = sample.temperature;
      if (!tempGroups.has(temp)) {
        tempGroups.set(temp, []);
      }
      tempGroups.get(temp)!.push(sample);
    });

    tempGroups.forEach((tempSamples, temperature) => {
      const tempWordCounts = new Map<string, number>();
      tempSamples.forEach(sample => {
        const count = tempWordCounts.get(sample.word) || 0;
        tempWordCounts.set(sample.word, count + 1);
      });

      byTemperature[temperature] = Array.from(tempWordCounts.entries())
        .map(([word, count]) => ({
          word,
          count,
          percentage: (count / tempSamples.length) * 100,
        }))
        .sort((a, b) => b.count - a.count);
    });

    return {
      experimentId: experiment.id,
      totalSamples,
      uniqueWords,
      topWords,
      entropy,
      byModel,
      byTemperature,
    };
  }

  // ==================== Control Methods ====================

  async abort(experimentId: string): Promise<void> {
    const runningExperiment = this.runningExperiments.get(experimentId);
    if (!runningExperiment) {
      throw new Error('Experiment not found or not running');
    }

    runningExperiment.abortController.abort();

    // Update experiment status to cancelled
    const { experiment, samples } = runningExperiment;
    experiment.status = 'cancelled';
    experiment.completedAt = new Date().toISOString();
    experiment.actualCost = samples.reduce((sum, sample) => sum + sample.cost, 0);

    await storage.saveExperiment(experiment);

    // Save partial results if we have samples
    if (samples.length > 0) {
      const results = this.generateResults(experiment, samples);
      await storage.saveResults(results);
    }

    this.runningExperiments.delete(experimentId);
  }

  getProgress(experimentId: string): RunProgress | null {
    const runningExperiment = this.runningExperiments.get(experimentId);
    return runningExperiment ? { ...runningExperiment.progress } : null;
  }

  isRunning(experimentId: string): boolean {
    return this.runningExperiments.has(experimentId);
  }

  getRunningExperiments(): string[] {
    return Array.from(this.runningExperiments.keys());
  }

  // ==================== Utility Methods ====================

  private findModelById(modelId: string) {
    for (const provider of PROVIDER_DATA) {
      const model = provider.models.find(m => m.id === modelId);
      if (model) {
        return model;
      }
    }
    return null;
  }

  private onProgressUpdate(experimentId: string, progress: RunProgress): void {
    // This could emit an event for real-time UI updates
    // For now, just log
    console.log(`Experiment ${experimentId} progress: ${progress.completedCalls}/${progress.totalCalls}`);
  }
}

// ==================== Singleton Instance ====================

export const experimentRunner = new ExperimentRunner();