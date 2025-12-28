/**
 * One Word - Storage Abstraction Layer
 *
 * Provides unified interface for localStorage (small data) and IndexedDB (large data)
 * - localStorage: API keys, settings, custom stimuli
 * - IndexedDB: Experiments, samples, results
 */

import type {
  UserSettings,
  Stimulus,
  Experiment,
  Sample,
  ExperimentResults,
  LocalStorageSchema
} from './types';

// ==================== LocalStorage Helpers ====================

class LocalStorageManager {
  private prefix = 'oneword:';

  private getKey(key: keyof LocalStorageSchema): string {
    return `${this.prefix}${key}`;
  }

  get<K extends keyof LocalStorageSchema>(key: K): LocalStorageSchema[K] | null {
    try {
      const value = localStorage.getItem(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return null;
    }
  }

  set<K extends keyof LocalStorageSchema>(key: K, value: LocalStorageSchema[K]): void {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing ${key} to localStorage:`, error);
      throw new Error(`Failed to save ${key} to local storage`);
    }
  }

  remove<K extends keyof LocalStorageSchema>(key: K): void {
    localStorage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// ==================== IndexedDB Helpers ====================

interface DBSchema {
  experiments: Experiment;
  samples: Sample;
  results: ExperimentResults;
  stimuli: Stimulus;
}

class IndexedDBManager {
  private dbName = 'oneword';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;

        // Experiments store
        if (!db.objectStoreNames.contains('experiments')) {
          const experimentsStore = db.createObjectStore('experiments', { keyPath: 'id' });
          experimentsStore.createIndex('status', 'status');
          experimentsStore.createIndex('createdAt', 'createdAt');
        }

        // Samples store - indexed by experimentId for fast queries
        if (!db.objectStoreNames.contains('samples')) {
          const samplesStore = db.createObjectStore('samples', { keyPath: 'id' });
          samplesStore.createIndex('experimentId', 'experimentId');
          samplesStore.createIndex('modelId', 'modelId');
          samplesStore.createIndex('timestamp', 'timestamp');
        }

        // Results store - aggregated data
        if (!db.objectStoreNames.contains('results')) {
          db.createObjectStore('results', { keyPath: 'experimentId' });
        }

        // User-created stimuli
        if (!db.objectStoreNames.contains('stimuli')) {
          const stimuliStore = db.createObjectStore('stimuli', { keyPath: 'id' });
          stimuliStore.createIndex('category', 'category');
          stimuliStore.createIndex('isBuiltIn', 'isBuiltIn');
        }
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('IndexedDB not initialized. Call init() first.');
    }
    return this.db;
  }

  async add<T extends keyof DBSchema>(store: T, data: DBSchema[T]): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.add(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to add to ${store}`));
    });
  }

  async put<T extends keyof DBSchema>(store: T, data: DBSchema[T]): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to update ${store}`));
    });
  }

  async get<T extends keyof DBSchema>(store: T, key: string): Promise<DBSchema[T] | null> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get from ${store}`));
    });
  }

  async getAll<T extends keyof DBSchema>(store: T): Promise<DBSchema[T][]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get all from ${store}`));
    });
  }

  async getByIndex<T extends keyof DBSchema>(
    store: T,
    indexName: string,
    value: string | number
  ): Promise<DBSchema[T][]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const index = objectStore.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to query ${store} by ${indexName}`));
    });
  }

  async delete<T extends keyof DBSchema>(store: T, key: string): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete from ${store}`));
    });
  }

  async clear<T extends keyof DBSchema>(store: T): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear ${store}`));
    });
  }
}

// ==================== Unified Storage Interface ====================

class StorageManager {
  private localStorage = new LocalStorageManager();
  private indexedDB = new IndexedDBManager();
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.indexedDB.init();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw new Error('Storage initialization failed');
    }
  }

  // ==================== API Keys ====================

  getAPIKeys(): Record<string, string> {
    return this.localStorage.get('keys') || {};
  }

  setAPIKey(providerId: string, key: string): void {
    const keys = this.getAPIKeys();
    keys[providerId] = key; // TODO: Add encryption
    this.localStorage.set('keys', keys);
  }

  removeAPIKey(providerId: string): void {
    const keys = this.getAPIKeys();
    delete keys[providerId];
    this.localStorage.set('keys', keys);
  }

  // ==================== Settings ====================

  getSettings(): UserSettings {
    return this.localStorage.get('settings') || {
      theme: 'dark',
      defaultSamplesPerConfig: 100,
      maxConcurrentRequests: 5,
      enableRealTimeResults: true
    };
  }

  setSettings(settings: UserSettings): void {
    this.localStorage.set('settings', settings);
  }

  // ==================== Experiments ====================

  async saveExperiment(experiment: Experiment): Promise<void> {
    await this.indexedDB.put('experiments', experiment);
  }

  async getExperiment(id: string): Promise<Experiment | null> {
    return this.indexedDB.get('experiments', id);
  }

  async getAllExperiments(): Promise<Experiment[]> {
    const experiments = await this.indexedDB.getAll('experiments');
    return experiments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getExperimentsByStatus(status: Experiment['status']): Promise<Experiment[]> {
    return this.indexedDB.getByIndex('experiments', 'status', status);
  }

  async deleteExperiment(id: string): Promise<void> {
    await Promise.all([
      this.indexedDB.delete('experiments', id),
      this.indexedDB.getByIndex('samples', 'experimentId', id).then(samples =>
        Promise.all(samples.map(sample => this.indexedDB.delete('samples', sample.id)))
      ),
      this.indexedDB.delete('results', id)
    ]);
  }

  // ==================== Samples ====================

  async saveSample(sample: Sample): Promise<void> {
    await this.indexedDB.add('samples', sample);
  }

  async saveSamples(samples: Sample[]): Promise<void> {
    // Batch operation - could be optimized with a transaction
    await Promise.all(samples.map(sample => this.indexedDB.add('samples', sample)));
  }

  async getSamplesByExperiment(experimentId: string): Promise<Sample[]> {
    return this.indexedDB.getByIndex('samples', 'experimentId', experimentId);
  }

  async getSamplesByModel(modelId: string): Promise<Sample[]> {
    return this.indexedDB.getByIndex('samples', 'modelId', modelId);
  }

  // ==================== Results ====================

  async saveResults(results: ExperimentResults): Promise<void> {
    await this.indexedDB.put('results', results);
  }

  async getResults(experimentId: string): Promise<ExperimentResults | null> {
    return this.indexedDB.get('results', experimentId);
  }

  // ==================== Stimuli ====================

  async getStimuli(): Promise<Stimulus[]> {
    const localStimuli = this.localStorage.get('stimuli') || [];
    const dbStimuli = await this.indexedDB.getAll('stimuli');
    return [...localStimuli, ...dbStimuli];
  }

  async saveStimulus(stimulus: Stimulus): Promise<void> {
    if (stimulus.isBuiltIn) {
      // Built-in stimuli go to localStorage for fast access
      const stimuli = this.localStorage.get('stimuli') || [];
      const existing = stimuli.findIndex(s => s.id === stimulus.id);
      if (existing >= 0) {
        stimuli[existing] = stimulus;
      } else {
        stimuli.push(stimulus);
      }
      this.localStorage.set('stimuli', stimuli);
    } else {
      // User-created stimuli go to IndexedDB
      await this.indexedDB.put('stimuli', stimulus);
    }
  }

  async deleteStimulus(id: string): Promise<void> {
    // Try to remove from both storage types
    const localStimuli = this.localStorage.get('stimuli') || [];
    const filtered = localStimuli.filter(s => s.id !== id);
    this.localStorage.set('stimuli', filtered);

    try {
      await this.indexedDB.delete('stimuli', id);
    } catch {
      // Ignore if not found in IndexedDB
    }
  }

  // ==================== Cleanup ====================

  async clearAllData(): Promise<void> {
    this.localStorage.clear();
    await Promise.all([
      this.indexedDB.clear('experiments'),
      this.indexedDB.clear('samples'),
      this.indexedDB.clear('results'),
      this.indexedDB.clear('stimuli')
    ]);
  }
}

// ==================== Singleton Instance ====================

export const storage = new StorageManager();

// ==================== Export Types ====================

export type { LocalStorageSchema, DBSchema };
export { LocalStorageManager, IndexedDBManager, StorageManager };