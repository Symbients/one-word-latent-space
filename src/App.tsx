import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/shell/components/AppShell';
import { KeysSection } from '@/sections/keys/components/KeysSection';
import { ExperimentSection } from '@/sections/experiment/components/ExperimentSection';
import { HelpModal } from '@/components/HelpModal';
import { storage } from '@/lib/storage';
import { providers, PROVIDER_DATA } from '@/lib/providers';
import { experimentRunner } from '@/lib/runner';
import type {
  ConfiguredKey,
  Experiment,
  RunProgress,
  ExperimentBuilderState,
  KeyValidationResult,
} from '@/lib/types';

interface AppProps {
  section: 'keys' | 'experiment';
}

const createExperimentId = (): string => `exp-${crypto.randomUUID()}`;

const validateProviderKey = async (
  providerId: string,
  key: string
): Promise<KeyValidationResult> => {
  try {
    return await providers.validateKey(providerId, key);
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
};

export function App({ section }: AppProps) {
  const navigate = useNavigate();

  // Application state
  const [isInitialized, setIsInitialized] = useState(false);
  const [configuredKeys, setConfiguredKeys] = useState<ConfiguredKey[]>([]);
  const [apiStatus, setApiStatus] = useState<'connected' | 'error' | 'unknown'>('unknown');
  const [currentExperiment, setCurrentExperiment] = useState<Experiment | null>(null);
  const [runProgress, setRunProgress] = useState<RunProgress | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const loadAndValidateKeys = async () => {
    const apiKeys = storage.getAPIKeys();
    const configured: ConfiguredKey[] = [];

    for (const provider of PROVIDER_DATA) {
      const key = apiKeys[provider.id];
      if (!key) continue;

      const validation = await validateProviderKey(provider.id, key);
      configured.push({
        providerId: provider.id,
        keyPreview: `${key.slice(0, 8)}...${key.slice(-4)}`,
        isValid: validation.isValid,
        lastValidated: new Date().toISOString(),
        addedAt: new Date().toISOString(), // TODO: Store actual add time
        validationError: validation.isValid
          ? undefined
          : validation.error || 'Validation failed',
      });
    }

    setConfiguredKeys(configured);

    // Update API status
    const hasValidKeys = configured.some(key => key.isValid);
    setApiStatus(hasValidKeys ? 'connected' : configured.length > 0 ? 'error' : 'unknown');
  };

  const initializeApp = async () => {
    try {
      // Initialize storage
      await storage.init();

      // Load and validate API keys
      await loadAndValidateKeys();

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      // Show error state or fallback
      setIsInitialized(true);
    }
  };

  // Initialize application
  useEffect(() => {
    initializeApp();
  }, []);

  // Poll for experiment progress
  useEffect(() => {
    if (!currentExperiment || currentExperiment.status !== 'running') {
      setRunProgress(null);
      return;
    }

    const interval = setInterval(() => {
      const progress = experimentRunner.getProgress(currentExperiment.id);
      setRunProgress(progress);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentExperiment?.id, currentExperiment?.status]);

  // Navigation handler
  const handleNavigate = (targetSection: 'keys' | 'experiment') => {
    navigate(`/${targetSection}`);
  };

  // Keys section handlers
  const handleAddKey = async (providerId: string, key: string): Promise<boolean> => {
    try {
      // Validate the key first
      const validation = await validateProviderKey(providerId, key);

      if (validation.isValid) {
        // Save to storage
        storage.setAPIKey(providerId, key);

        // Update state
        await loadAndValidateKeys();

        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Failed to add key:', error);
      return false;
    }
  };

  const handleRemoveKey = (providerId: string): void => {
    storage.removeAPIKey(providerId);
    loadAndValidateKeys();
  };

  const handleValidateKey = async (providerId: string): Promise<boolean> => {
    const apiKeys = storage.getAPIKeys();
    const key = apiKeys[providerId];

    if (!key) {
      return false;
    }

    try {
      const validation = await validateProviderKey(providerId, key);

      // Update the specific key's validation status
      setConfiguredKeys(prev => prev.map(configuredKey =>
        configuredKey.providerId === providerId
          ? {
            ...configuredKey,
            isValid: validation.isValid,
            lastValidated: new Date().toISOString(),
            validationError: validation.isValid
              ? undefined
              : validation.error || 'Validation failed',
          }
          : configuredKey
      ));

      return validation.isValid;
    } catch (error) {
      console.error('Key validation failed:', error);
      return false;
    }
  };

  const handleValidateAllKeys = async (): Promise<void> => {
    await loadAndValidateKeys();
  };

  const handleValidateNewKey = async (
    providerId: string,
    key: string
  ): Promise<KeyValidationResult> => validateProviderKey(providerId, key);

  // Experiment section handlers
  const handleCreateExperiment = async (builderState: ExperimentBuilderState): Promise<Experiment> => {
    // Generate experiment configurations
    const configs = [];

    if (builderState.temperatureMode === 'single' && builderState.topKMode === 'single') {
      configs.push({
        temperature: builderState.temperatureSingle,
        topK: builderState.topKSingle,
      });
    } else {
      // Generate grid of configurations
      const temps = builderState.temperatureMode === 'range'
        ? generateRange(builderState.temperatureMin, builderState.temperatureMax, builderState.temperatureSteps)
        : [builderState.temperatureSingle];

      const topKs = builderState.topKMode === 'range'
        ? generateRange(builderState.topKMin, builderState.topKMax, builderState.topKSteps)
        : [builderState.topKSingle];

      for (const temp of temps) {
        for (const topK of topKs) {
          configs.push({ temperature: temp, topK });
        }
      }
    }

    const totalCalls = builderState.selectedModels.length * configs.length * builderState.samplesPerConfig;

    // Estimate cost
    let estimatedCost = 0;
    for (const modelId of builderState.selectedModels) {
      const model = PROVIDER_DATA.flatMap(p => p.models).find(m => m.id === modelId);
      if (model) {
        const inputTokens = Math.ceil(builderState.stimulus.length / 4); // Rough estimate
        const outputTokens = 1; // One word
        const callsPerModel = configs.length * builderState.samplesPerConfig;

        const costPerCall = providers.estimateCost(model.providerId, {
          model: modelId,
          inputTokens,
          outputTokens,
        });

        estimatedCost += costPerCall * callsPerModel;
      }
    }

    const experiment: Experiment = {
      id: createExperimentId(),
      stimulus: builderState.stimulus,
      selectedModels: builderState.selectedModels,
      configs,
      samplesPerConfig: builderState.samplesPerConfig,
      estimatedCost,
      totalCalls,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await storage.saveExperiment(experiment);
    setCurrentExperiment(experiment);

    return experiment;
  };

  const handleRunExperiment = async (experiment: Experiment): Promise<void> => {
    const apiKeys = storage.getAPIKeys();
    console.log('[DEBUG] Starting experiment');
    console.log('[DEBUG] API keys available for:', Object.keys(apiKeys));
    console.log('[DEBUG] Selected models:', experiment.selectedModels);

    try {
      await experimentRunner.start(experiment, apiKeys);
      console.log('[DEBUG] Experiment started successfully');
      setCurrentExperiment({ ...experiment, status: 'running' });
    } catch (error) {
      console.error('[DEBUG] Failed to start experiment:', error);
    }
  };

  const handleStopExperiment = async (): Promise<void> => {
    if (currentExperiment) {
      await experimentRunner.abort(currentExperiment.id);
      setCurrentExperiment({ ...currentExperiment, status: 'cancelled' });
    }
  };

  const handleHelpClick = (): void => {
    setShowHelp(true);
  };

  // Utility function to generate numeric ranges
  const generateRange = (min: number, max: number, steps: number): number[] => {
    if (steps === 1) return [min];
    const stepSize = (max - min) / (steps - 1);
    return Array.from({ length: steps }, (_, i) => min + i * stepSize);
  };

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Initializing One Word...</p>
        </div>
      </div>
    );
  }

  const hasValidKeys = configuredKeys.some(key => key.isValid);
  const isRunning = currentExperiment?.status === 'running';

  return (
    <>
      <AppShell
        currentSection={section}
        keysConfigured={hasValidKeys}
        apiStatus={apiStatus}
        isRunning={isRunning}
        onNavigate={handleNavigate}
        onHelpClick={handleHelpClick}
      >
        {section === 'keys' && (
          <KeysSection
            providers={PROVIDER_DATA}
            configuredKeys={configuredKeys}
            onAddKey={handleAddKey}
            onRemoveKey={handleRemoveKey}
            onValidateKey={handleValidateKey}
            onValidateAll={handleValidateAllKeys}
            onValidateNewKey={handleValidateNewKey}
          />
        )}

        {section === 'experiment' && (
          <ExperimentSection
            providers={PROVIDER_DATA}
            configuredKeys={configuredKeys}
            currentExperiment={currentExperiment}
            runProgress={runProgress}
            onCreateExperiment={handleCreateExperiment}
            onRunExperiment={handleRunExperiment}
            onStopExperiment={handleStopExperiment}
          />
        )}
      </AppShell>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
