/**
 * One Word - Core Data Types
 *
 * Type definitions for the One Word application based on the data model specification.
 */

// ==================== Provider & API Key Types ====================

export interface Provider {
  id: string;
  name: string;
  icon: string;
  accentColor: string;
  baseUrl: string;
  models: Model[];
}

export interface Model {
  id: string;
  providerId: string;
  name: string;
  generation: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
}

export interface APIKey {
  providerId: string;
  key: string;
  isValid: boolean;
  addedAt: string;
}

export interface ConfiguredKey {
  providerId: string;
  keyPreview: string;
  isValid: boolean;
  lastValidated: string;
  addedAt: string;
  validationError?: string;
}

export interface KeyValidationResult {
  isValid: boolean;
  error?: string;
  models?: Model[];
}

// ==================== Keys State Management ====================

export interface KeysState {
  providers: Provider[];
  configuredKeys: ConfiguredKey[];
  unconfiguredProviders: string[];
}

export interface AddKeyFormData {
  providerId: string;
  key: string;
}

// ==================== Stimulus Types ====================

export interface Stimulus {
  id: string;
  text: string;
  category: string;
  isBuiltIn: boolean;
}

export interface StimulusCategory {
  id: string;
  name: string;
  description: string;
}

// ==================== Experiment Configuration ====================

export interface ExperimentConfig {
  temperature: number;
  topK: number;
}

export interface ExperimentBuilderState {
  stimulus: string;
  selectedModels: string[];
  temperatureMode: 'single' | 'range';
  temperatureSingle: number;
  temperatureMin: number;
  temperatureMax: number;
  temperatureSteps: number;
  topKMode: 'single' | 'range';
  topKSingle: number;
  topKMin: number;
  topKMax: number;
  topKSteps: number;
  samplesPerConfig: number;
}

// ==================== Experiment & Results ====================

export interface Experiment {
  id: string;
  stimulus: string;
  selectedModels: string[];
  configs: ExperimentConfig[];
  samplesPerConfig: number;
  estimatedCost: number;
  actualCost?: number;
  totalCalls: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
}

export interface Sample {
  id: string;
  experimentId: string;
  modelId: string;
  temperature: number;
  topK: number;
  word: string;
  latencyMs: number;
  cost: number;
  timestamp: string;
}

export interface WordFrequency {
  word: string;
  count: number;
  percentage: number;
}

export interface ModelResult {
  modelId: string;
  config: ExperimentConfig;
  words: WordFrequency[];
  totalSamples: number;
  uniqueWords: number;
}

export interface ExperimentResults {
  experimentId: string;
  totalSamples: number;
  uniqueWords: number;
  topWords: WordFrequency[];
  entropy: number;
  byModel: ModelResult[];
  byTemperature: Record<number, WordFrequency[]>;
}

// ==================== Execution & Progress ====================

export interface RunProgress {
  totalCalls: number;
  completedCalls: number;
  currentModel: string;
  currentConfig: ExperimentConfig;
  estimatedTimeRemaining: number;
  runningCost: number;
  recentWords: string[];
}

// ==================== Provider API Interface ====================

export interface SampleParams {
  model: string;
  stimulus: string;
  temperature: number;
  topK: number;
  maxTokens?: number;
}

export interface CostParams {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderInterface {
  id: string;
  name: string;
  validateKey: (key: string) => Promise<boolean>;
  sample: (params: SampleParams, key: string) => Promise<string>;
  estimateCost: (params: CostParams) => number;
}

// ==================== Storage Schema ====================

export interface LocalStorageSchema {
  'keys': Record<string, string>; // providerId -> encrypted key
  'settings': UserSettings;
  'stimuli': Stimulus[];
}

export interface UserSettings {
  theme: 'dark' | 'light';
  defaultSamplesPerConfig: number;
  maxConcurrentRequests: number;
  enableRealTimeResults: boolean;
}

// ==================== IndexedDB Schema ====================

export type ExperimentRecord = Experiment;

export type SampleRecord = Sample;

export type ExperimentResultsRecord = ExperimentResults;

// ==================== App State ====================

export interface AppState {
  keysState: KeysState;
  experimentBuilder: ExperimentBuilderState;
  currentExperiment?: Experiment;
  runProgress?: RunProgress;
  settings: UserSettings;
}