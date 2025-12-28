import { useState, useEffect } from 'react';
import { StimulusInput } from './StimulusInput';
import { ParameterDials } from './ParameterDials';
import { ModelSelector } from './ModelSelector';
import { ObservationProgress } from './ObservationProgress';
import { WordEmergence } from './WordEmergence';
import { ResultsView } from './ResultsView';
import type {
  Provider,
  ConfiguredKey,
  ExperimentBuilderState,
  Experiment,
  ExperimentResults,
  RunProgress as RunProgressType
} from '../../../lib/types';

interface ExperimentSectionProps {
  providers: Provider[];
  configuredKeys: ConfiguredKey[];
  currentExperiment: Experiment | null;
  runProgress: RunProgressType | null;
  onCreateExperiment: (config: ExperimentBuilderState) => Promise<Experiment>;
  onRunExperiment: (experiment: Experiment) => Promise<void>;
  onStopExperiment: () => Promise<void>;
}

const TOKENS_PER_CALL = 50; // ~input tokens per call
const OUTPUT_TOKENS = 2;    // one word ≈ 2 tokens

const defaultState: ExperimentBuilderState = {
  stimulus: '',
  selectedModels: [],
  temperatureMode: 'single',
  temperatureSingle: 0.7,
  temperatureMin: 0.0,
  temperatureMax: 1.5,
  temperatureSteps: 4,
  topKMode: 'single',
  topKSingle: 40,
  topKMin: 1,
  topKMax: 100,
  topKSteps: 3,
  samplesPerConfig: 100,
};

export function ExperimentSection({
  providers,
  configuredKeys,
  currentExperiment,
  runProgress,
  onCreateExperiment,
  onRunExperiment,
  onStopExperiment,
}: ExperimentSectionProps) {
  const [state, setState] = useState<ExperimentBuilderState>(defaultState);
  const [results, setResults] = useState<ExperimentResults | null>(null);

  const allModels = providers.flatMap(p => p.models);
  const validProviderIds = configuredKeys
    .filter(key => key.isValid)
    .map(key => key.providerId);
  const availableModels = allModels.filter(model =>
    validProviderIds.includes(model.providerId)
  );

  const configCount =
    (state.temperatureMode === 'single' ? 1 : state.temperatureSteps) *
    (state.topKMode === 'single' ? 1 : state.topKSteps);
  const totalCalls = state.selectedModels.length * configCount * state.samplesPerConfig;
  const isRunning = currentExperiment?.status === 'running';
  const isCompleted = currentExperiment?.status === 'completed';

  // Estimate cost using model pricing from providers data
  const estimatedCost = state.selectedModels.reduce((total, modelId) => {
    const model = allModels.find(m => m.id === modelId);
    if (!model) return total;
    const callsForModel = configCount * state.samplesPerConfig;
    const inputCost = (TOKENS_PER_CALL / 1000) * model.inputCostPer1k * callsForModel;
    const outputCost = (OUTPUT_TOKENS / 1000) * model.outputCostPer1k * callsForModel;
    return total + inputCost + outputCost;
  }, 0);

  const canRun =
    state.stimulus.trim().length > 0 &&
    state.selectedModels.length > 0 &&
    !isRunning &&
    availableModels.length > 0;

  const handleRun = async () => {
    try {
      const experiment = await onCreateExperiment(state);
      await onRunExperiment(experiment);
    } catch (error) {
      console.error('Failed to start experiment:', error);
    }
  };

  useEffect(() => {
    if (currentExperiment && currentExperiment.status === 'completed') {
      import('../../../lib/storage').then(({ storage }) => {
        storage.getResults(currentExperiment.id).then(results => {
          if (results) setResults(results);
        });
      });
    }
  }, [currentExperiment?.id, currentExperiment?.status]);

  // If running, show the observation view
  if (isRunning && runProgress) {
    return (
      <div className="space-y-12 stagger-children">
        <ObservationProgress
          progress={runProgress}
          stimulus={state.stimulus}
          onStop={onStopExperiment}
        />
        <WordEmergence words={runProgress.recentWords} />
      </div>
    );
  }

  // If completed, show results
  if (results && isCompleted) {
    return (
      <div className="space-y-12 stagger-children">
        <div className="text-center space-y-2">
          <h1 style={{ color: 'var(--brass)' }}>Observation Complete</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {results.totalSamples.toLocaleString()} samples collected
          </p>
        </div>
        <ResultsView results={results} />
        <div className="text-center">
          <button
            onClick={() => {
              setResults(null);
            }}
            className="obs-button-ghost"
          >
            Begin New Observation
          </button>
        </div>
      </div>
    );
  }

  // Builder view
  return (
    <div className="space-y-12 stagger-children">
      {/* Title */}
      <div className="text-center space-y-3">
        <h1>Begin Observation</h1>
        <p style={{ color: 'var(--text-secondary)' }} className="max-w-md mx-auto text-pretty">
          Probe the latent space. Set a stimulus, configure parameters,
          and observe what emerges from the probability field.
        </p>
      </div>

      {/* Stimulus - the focal point */}
      <StimulusInput
        value={state.stimulus}
        onChange={(stimulus) => setState({ ...state, stimulus })}
      />

      {/* Parameters */}
      <ParameterDials
        temperatureMode={state.temperatureMode}
        temperatureSingle={state.temperatureSingle}
        temperatureMin={state.temperatureMin}
        temperatureMax={state.temperatureMax}
        temperatureSteps={state.temperatureSteps}
        onTemperatureModeChange={(mode) => setState({ ...state, temperatureMode: mode })}
        onTemperatureSingleChange={(temp) => setState({ ...state, temperatureSingle: temp })}
        onTemperatureMinChange={(min) => setState({ ...state, temperatureMin: min })}
        onTemperatureMaxChange={(max) => setState({ ...state, temperatureMax: max })}
        onTemperatureStepsChange={(steps) => setState({ ...state, temperatureSteps: steps })}
        topKMode={state.topKMode}
        topKSingle={state.topKSingle}
        topKMin={state.topKMin}
        topKMax={state.topKMax}
        topKSteps={state.topKSteps}
        onTopKModeChange={(mode) => setState({ ...state, topKMode: mode })}
        onTopKSingleChange={(topK) => setState({ ...state, topKSingle: topK })}
        onTopKMinChange={(min) => setState({ ...state, topKMin: min })}
        onTopKMaxChange={(max) => setState({ ...state, topKMax: max })}
        onTopKStepsChange={(steps) => setState({ ...state, topKSteps: steps })}
        samples={state.samplesPerConfig}
        onSamplesChange={(samples) => setState({ ...state, samplesPerConfig: samples })}
      />

      {/* Models */}
      <ModelSelector
        providers={providers}
        availableModels={availableModels}
        selectedModels={state.selectedModels}
        configuredKeys={configuredKeys}
        onChange={(selectedModels) => setState({ ...state, selectedModels })}
      />

      {/* Observation summary & action */}
      <div className="text-center space-y-6">
        {/* Summary */}
        <div className="obs-rule" />
        <div className="flex justify-center gap-8 py-4">
          <div className="text-center">
            <p className="obs-etched mb-1">Total Calls</p>
            <p className="font-mono text-xl" style={{ color: 'var(--text-primary)' }}>
              {totalCalls.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="obs-etched mb-1">Models</p>
            <p className="font-mono text-xl" style={{ color: 'var(--text-primary)' }}>
              {state.selectedModels.length}
            </p>
          </div>
          <div className="text-center">
            <p className="obs-etched mb-1">Est. Time</p>
            <p className="font-mono text-xl" style={{ color: 'var(--text-primary)' }}>
              ~{Math.ceil(totalCalls / 60)}m
            </p>
          </div>
          <div className="text-center">
            <p className="obs-etched mb-1">Est. Cost</p>
            <p className="font-mono text-xl" style={{ color: 'var(--brass)' }}>
              ${estimatedCost.toFixed(2)}
            </p>
          </div>
        </div>
        {estimatedCost > 10 && (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            This observation will cost more than $10. Consider reducing samples or models.
          </p>
        )}
        <div className="obs-rule" />

        {/* Action */}
        <button
          onClick={handleRun}
          disabled={!canRun}
          className="obs-button-primary px-8 py-3 rounded"
        >
          {canRun ? 'Begin Observation' : 'Configure to Observe'}
        </button>

        {!canRun && (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {!state.stimulus.trim() && 'Enter a stimulus. '}
            {state.selectedModels.length === 0 && 'Select at least one model. '}
            {availableModels.length === 0 && 'Configure API keys first.'}
          </p>
        )}
      </div>
    </div>
  );
}
