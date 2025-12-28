/**
 * One Word - Anonymous Data Collection API
 *
 * Collects experiment results anonymously (no API keys, no PII)
 * for aggregate analysis and community insights.
 */

import { serve } from 'bun';
import { Database } from 'bun:sqlite';

// Initialize SQLite database
const db = new Database('oneword-community.db');

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS experiments (
    id TEXT PRIMARY KEY,
    stimulus TEXT NOT NULL,
    models TEXT NOT NULL,
    temperature_min REAL,
    temperature_max REAL,
    temperature_steps INTEGER,
    top_k_min INTEGER,
    top_k_max INTEGER,
    top_k_steps INTEGER,
    samples_per_config INTEGER,
    total_samples INTEGER,
    unique_words INTEGER,
    entropy REAL,
    estimated_cost REAL,
    error_count INTEGER DEFAULT 0,
    errors TEXT,
    duration_ms INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add columns if they don't exist (migration for existing DBs)
try { db.run('ALTER TABLE experiments ADD COLUMN estimated_cost REAL'); } catch {}
try { db.run('ALTER TABLE experiments ADD COLUMN error_count INTEGER DEFAULT 0'); } catch {}
try { db.run('ALTER TABLE experiments ADD COLUMN errors TEXT'); } catch {}
try { db.run('ALTER TABLE experiments ADD COLUMN duration_ms INTEGER'); } catch {}

db.run(`
  CREATE TABLE IF NOT EXISTS word_frequencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id TEXT NOT NULL,
    model_id TEXT,
    temperature REAL,
    word TEXT NOT NULL,
    count INTEGER NOT NULL,
    percentage REAL NOT NULL,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
  )
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_word ON word_frequencies(word)
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_model ON word_frequencies(model_id)
`);

interface ExperimentSubmission {
  stimulus: string;
  models: string[];
  config: {
    temperatureMin?: number;
    temperatureMax?: number;
    temperatureSteps?: number;
    topKMin?: number;
    topKMax?: number;
    topKSteps?: number;
    samplesPerConfig: number;
  };
  results: {
    totalSamples: number;
    uniqueWords: number;
    entropy: number;
    topWords: Array<{ word: string; count: number; percentage: number }>;
    byModel?: Array<{
      modelId: string;
      words: Array<{ word: string; count: number; percentage: number }>;
    }>;
    byTemperature?: Record<string, Array<{ word: string; count: number; percentage: number }>>;
  };
  estimatedCost?: number;
  errorCount?: number;
  errors?: string[];
  durationMs?: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

serve({
  port: 3001,

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Submit experiment results
    if (req.method === 'POST' && url.pathname === '/api/community/submit') {
      try {
        const data: ExperimentSubmission = await req.json();

        // Generate unique ID
        const expId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // Insert experiment
        db.run(`
          INSERT INTO experiments (
            id, stimulus, models, temperature_min, temperature_max, temperature_steps,
            top_k_min, top_k_max, top_k_steps, samples_per_config,
            total_samples, unique_words, entropy, estimated_cost, error_count, errors, duration_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          expId,
          data.stimulus,
          JSON.stringify(data.models),
          data.config.temperatureMin ?? null,
          data.config.temperatureMax ?? null,
          data.config.temperatureSteps ?? null,
          data.config.topKMin ?? null,
          data.config.topKMax ?? null,
          data.config.topKSteps ?? null,
          data.config.samplesPerConfig,
          data.results.totalSamples,
          data.results.uniqueWords,
          data.results.entropy,
          data.estimatedCost ?? null,
          data.errorCount ?? 0,
          data.errors ? JSON.stringify(data.errors) : null,
          data.durationMs ?? null,
        ]);

        // Insert top words
        const insertWord = db.prepare(`
          INSERT INTO word_frequencies (experiment_id, model_id, temperature, word, count, percentage)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        // Overall top words
        for (const w of data.results.topWords.slice(0, 50)) {
          insertWord.run(expId, null, null, w.word, w.count, w.percentage);
        }

        // By model
        if (data.results.byModel) {
          for (const m of data.results.byModel) {
            for (const w of m.words.slice(0, 20)) {
              insertWord.run(expId, m.modelId, null, w.word, w.count, w.percentage);
            }
          }
        }

        // By temperature
        if (data.results.byTemperature) {
          for (const [temp, words] of Object.entries(data.results.byTemperature)) {
            for (const w of words.slice(0, 20)) {
              insertWord.run(expId, null, parseFloat(temp), w.word, w.count, w.percentage);
            }
          }
        }

        return Response.json({ success: true, id: expId }, { headers: corsHeaders });
      } catch (error) {
        console.error('Submit error:', error);
        return Response.json(
          { error: 'Failed to save experiment' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Get community stats
    if (req.method === 'GET' && url.pathname === '/api/community/stats') {
      try {
        const totalExperiments = db.query('SELECT COUNT(*) as count FROM experiments').get() as { count: number };
        const totalSamples = db.query('SELECT SUM(total_samples) as total FROM experiments').get() as { total: number };
        const avgEntropy = db.query('SELECT AVG(entropy) as avg FROM experiments').get() as { avg: number };
        const totalCost = db.query('SELECT SUM(estimated_cost) as total FROM experiments').get() as { total: number };
        const totalErrors = db.query('SELECT SUM(error_count) as total FROM experiments').get() as { total: number };
        const experimentsWithErrors = db.query('SELECT COUNT(*) as count FROM experiments WHERE error_count > 0').get() as { count: number };

        // Top words across all experiments
        const topWords = db.query(`
          SELECT word, SUM(count) as total_count
          FROM word_frequencies
          WHERE model_id IS NULL AND temperature IS NULL
          GROUP BY word
          ORDER BY total_count DESC
          LIMIT 20
        `).all() as Array<{ word: string; total_count: number }>;

        // Most used models
        const modelUsage = db.query(`
          SELECT model_id, COUNT(DISTINCT experiment_id) as experiment_count
          FROM word_frequencies
          WHERE model_id IS NOT NULL
          GROUP BY model_id
          ORDER BY experiment_count DESC
          LIMIT 10
        `).all() as Array<{ model_id: string; experiment_count: number }>;

        // Popular stimuli (anonymized)
        const stimuliCount = db.query(`
          SELECT stimulus, COUNT(*) as count
          FROM experiments
          GROUP BY stimulus
          ORDER BY count DESC
          LIMIT 10
        `).all() as Array<{ stimulus: string; count: number }>;

        return Response.json({
          totalExperiments: totalExperiments.count,
          totalSamples: totalSamples.total || 0,
          avgEntropy: avgEntropy.avg || 0,
          totalCost: totalCost.total || 0,
          totalErrors: totalErrors.total || 0,
          experimentsWithErrors: experimentsWithErrors.count || 0,
          topWords,
          modelUsage,
          popularStimuli: stimuliCount,
        }, { headers: corsHeaders });
      } catch (error) {
        console.error('Stats error:', error);
        return Response.json(
          { error: 'Failed to get stats' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Get recent experiments (anonymized)
    if (req.method === 'GET' && url.pathname === '/api/community/recent') {
      try {
        const recent = db.query(`
          SELECT
            id,
            stimulus,
            models,
            total_samples,
            unique_words,
            entropy,
            estimated_cost,
            error_count,
            errors,
            duration_ms,
            created_at
          FROM experiments
          ORDER BY created_at DESC
          LIMIT 50
        `).all();

        return Response.json({ experiments: recent }, { headers: corsHeaders });
      } catch (error) {
        console.error('Recent error:', error);
        return Response.json(
          { error: 'Failed to get recent experiments' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Word lookup - find all experiments containing a word
    if (req.method === 'GET' && url.pathname === '/api/community/word') {
      const word = url.searchParams.get('q');
      if (!word) {
        return Response.json({ error: 'Missing word parameter' }, { status: 400, headers: corsHeaders });
      }

      try {
        const results = db.query(`
          SELECT
            wf.experiment_id,
            e.stimulus,
            e.models,
            wf.model_id,
            wf.temperature,
            wf.count,
            wf.percentage
          FROM word_frequencies wf
          JOIN experiments e ON e.id = wf.experiment_id
          WHERE wf.word = ?
          ORDER BY wf.percentage DESC
          LIMIT 50
        `).all(word.toLowerCase());

        return Response.json({ word, occurrences: results }, { headers: corsHeaders });
      } catch (error) {
        console.error('Word lookup error:', error);
        return Response.json(
          { error: 'Failed to lookup word' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Export all data as JSON
    if (req.method === 'GET' && url.pathname === '/api/community/export') {
      try {
        const experiments = db.query(`
          SELECT * FROM experiments ORDER BY created_at DESC
        `).all();

        const wordFrequencies = db.query(`
          SELECT wf.*, e.stimulus
          FROM word_frequencies wf
          JOIN experiments e ON e.id = wf.experiment_id
          ORDER BY wf.experiment_id, wf.count DESC
        `).all();

        const stats = {
          exportedAt: new Date().toISOString(),
          totalExperiments: experiments.length,
          totalWordEntries: wordFrequencies.length,
        };

        return Response.json({
          stats,
          experiments,
          wordFrequencies,
        }, {
          headers: {
            ...corsHeaders,
            'Content-Disposition': `attachment; filename="oneword-export-${Date.now()}.json"`,
          }
        });
      } catch (error) {
        console.error('Export error:', error);
        return Response.json(
          { error: 'Failed to export data' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
  },
});

console.log('One Word Community API running on http://localhost:3001');
