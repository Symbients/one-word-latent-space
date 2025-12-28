/**
 * One Word - Community Data Service
 *
 * Handles anonymous submission and retrieval of community experiment data.
 * No API keys or PII are ever transmitted.
 */

import type { ExperimentResults, ExperimentBuilderState, Experiment } from './types';

const API_BASE = '/api/community';

interface CommunityStats {
  totalExperiments: number;
  totalSamples: number;
  avgEntropy: number;
  topWords: Array<{ word: string; total_count: number }>;
  modelUsage: Array<{ model_id: string; experiment_count: number }>;
  popularStimuli: Array<{ stimulus: string; count: number }>;
}

interface RecentExperiment {
  id: string;
  stimulus: string;
  models: string;
  total_samples: number;
  unique_words: number;
  entropy: number;
  created_at: string;
}

interface WordOccurrence {
  experiment_id: string;
  stimulus: string;
  models: string;
  model_id: string | null;
  temperature: number | null;
  count: number;
  percentage: number;
}

export async function submitToCommunity(
  builderState: ExperimentBuilderState,
  results: ExperimentResults
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stimulus: builderState.stimulus,
        models: builderState.selectedModels,
        config: {
          temperatureMin: builderState.temperatureMode === 'range' ? builderState.temperatureMin : undefined,
          temperatureMax: builderState.temperatureMode === 'range' ? builderState.temperatureMax : undefined,
          temperatureSteps: builderState.temperatureMode === 'range' ? builderState.temperatureSteps : undefined,
          topKMin: builderState.topKMode === 'range' ? builderState.topKMin : undefined,
          topKMax: builderState.topKMode === 'range' ? builderState.topKMax : undefined,
          topKSteps: builderState.topKMode === 'range' ? builderState.topKSteps : undefined,
          samplesPerConfig: builderState.samplesPerConfig,
        },
        results: {
          totalSamples: results.totalSamples,
          uniqueWords: results.uniqueWords,
          entropy: results.entropy,
          topWords: results.topWords.slice(0, 50),
          byModel: results.byModel?.map(m => ({
            modelId: m.modelId,
            words: m.words.slice(0, 20),
          })),
          byTemperature: results.byTemperature,
        },
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || 'Submission failed' };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Community submission error:', error);
    return { success: false, error: 'Network error' };
  }
}

// Auto-submit from runner (uses Experiment object directly)
export async function autoSubmitExperiment(
  experiment: Experiment,
  results: ExperimentResults
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Extract temperature range from configs
    const temps = experiment.configs.map(c => c.temperature);
    const topKs = experiment.configs.map(c => c.topK);

    const response = await fetch(`${API_BASE}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stimulus: experiment.stimulus,
        models: experiment.selectedModels,
        config: {
          temperatureMin: Math.min(...temps),
          temperatureMax: Math.max(...temps),
          temperatureSteps: new Set(temps).size,
          topKMin: Math.min(...topKs),
          topKMax: Math.max(...topKs),
          topKSteps: new Set(topKs).size,
          samplesPerConfig: experiment.samplesPerConfig,
        },
        results: {
          totalSamples: results.totalSamples,
          uniqueWords: results.uniqueWords,
          entropy: results.entropy,
          topWords: results.topWords.slice(0, 50),
          byModel: results.byModel?.map(m => ({
            modelId: m.modelId,
            words: m.words.slice(0, 20),
          })),
          byTemperature: results.byTemperature,
        },
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || 'Submission failed' };
    }

    const data = await response.json();
    console.log('[COMMUNITY] Experiment auto-submitted:', data.id);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('[COMMUNITY] Auto-submit error:', error);
    return { success: false, error: 'Network error' };
  }
}

export async function getCommunityStats(): Promise<CommunityStats | null> {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to get community stats:', error);
    return null;
  }
}

export async function getRecentExperiments(): Promise<RecentExperiment[]> {
  try {
    const response = await fetch(`${API_BASE}/recent`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.experiments || [];
  } catch (error) {
    console.error('Failed to get recent experiments:', error);
    return [];
  }
}

export async function lookupWord(word: string): Promise<{
  word: string;
  occurrences: WordOccurrence[];
} | null> {
  try {
    const response = await fetch(`${API_BASE}/word?q=${encodeURIComponent(word)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to lookup word:', error);
    return null;
  }
}
