import { useState, useRef, useCallback } from 'react';
import type { ExperimentResults, WordFrequency } from '../../../lib/types';
import {
  InteractiveWordCloud,
  EntropyCurve,
  ModelDivergenceHeatmap,
  WordTrajectory,
  RadialDistribution,
} from './Visualizations';

// Export utilities
const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToCSV = (results: ExperimentResults): string => {
  const lines: string[] = [];

  // Header
  lines.push('# One Word Experiment Results');
  lines.push(`# Total Samples: ${results.totalSamples}`);
  lines.push(`# Unique Words: ${results.uniqueWords}`);
  lines.push(`# Entropy: ${results.entropy.toFixed(4)}`);
  lines.push('');

  // Top words
  lines.push('rank,word,count,percentage');
  results.topWords.forEach((w, i) => {
    lines.push(`${i + 1},"${w.word}",${w.count},${w.percentage.toFixed(2)}`);
  });

  // By model
  if (results.byModel?.length) {
    lines.push('');
    lines.push('# By Model');
    lines.push('model,word,count,percentage');
    results.byModel.forEach(m => {
      m.words.forEach(w => {
        lines.push(`"${m.modelId}","${w.word}",${w.count},${w.percentage.toFixed(2)}`);
      });
    });
  }

  // By temperature
  const temps = Object.keys(results.byTemperature || {});
  if (temps.length) {
    lines.push('');
    lines.push('# By Temperature');
    lines.push('temperature,word,count,percentage');
    Object.entries(results.byTemperature || {}).forEach(([temp, words]) => {
      words.forEach(w => {
        lines.push(`${temp},"${w.word}",${w.count},${w.percentage.toFixed(2)}`);
      });
    });
  }

  return lines.join('\n');
};

const exportToJSON = (results: ExperimentResults): string => {
  return JSON.stringify(results, null, 2);
};

const exportToPNG = async (element: HTMLElement, filename: string) => {
  // Dynamic import of html-to-image
  const { toPng } = await import('html-to-image');

  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#0f172a', // slate-900
      pixelRatio: 2,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to export PNG:', error);
  }
};

interface ResultsViewProps {
  results: ExperimentResults;
}

type ViewMode = 'cloud' | 'table' | 'models' | 'temperature' | 'entropy' | 'heatmap' | 'trajectory' | 'radial';

export function ResultsView({ results }: ResultsViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cloud');
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const timestamp = new Date().toISOString().split('T')[0];

  const handleExportCSV = useCallback(() => {
    const csv = exportToCSV(results);
    downloadFile(csv, `oneword-results-${timestamp}.csv`, 'text/csv');
  }, [results, timestamp]);

  const handleExportJSON = useCallback(() => {
    const json = exportToJSON(results);
    downloadFile(json, `oneword-results-${timestamp}.json`, 'application/json');
  }, [results, timestamp]);

  const handleExportPNG = useCallback(async () => {
    if (!contentRef.current) return;
    setIsExporting(true);
    try {
      await exportToPNG(contentRef.current, `oneword-results-${timestamp}.png`);
    } finally {
      setIsExporting(false);
    }
  }, [timestamp]);

  const viewModes: { id: ViewMode; label: string; group: 'basic' | 'advanced' }[] = [
    { id: 'cloud', label: 'Cloud', group: 'basic' },
    { id: 'table', label: 'Table', group: 'basic' },
    { id: 'models', label: 'Models', group: 'basic' },
    { id: 'temperature', label: 'Temp Grid', group: 'basic' },
    { id: 'entropy', label: 'Entropy', group: 'advanced' },
    { id: 'heatmap', label: 'Similarity', group: 'advanced' },
    { id: 'trajectory', label: 'Trajectory', group: 'advanced' },
    { id: 'radial', label: 'Radial', group: 'advanced' },
  ];

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden" ref={contentRef}>
      {/* Header */}
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-heading text-lg font-medium text-white">Results</h3>
          <div className="flex items-center gap-1 flex-wrap">
            {viewModes.map((mode, i) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  viewMode === mode.id
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                } ${i === 4 ? 'ml-2 border-l border-slate-600 pl-3' : ''}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm flex-wrap">
          <div>
            <span className="text-slate-500">Samples:</span>{' '}
            <span className="font-mono text-white">{results.totalSamples.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500">Unique words:</span>{' '}
            <span className="font-mono text-white">{results.uniqueWords}</span>
          </div>
          <div>
            <span className="text-slate-500">Entropy:</span>{' '}
            <span className="font-mono text-white">{results.entropy.toFixed(2)} bits</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Basic views */}
        {viewMode === 'cloud' && (
          <InteractiveWordCloud words={results.topWords} />
        )}
        {viewMode === 'table' && (
          <FrequencyTable words={results.topWords} />
        )}
        {viewMode === 'models' && (
          <ModelComparison results={results} />
        )}
        {viewMode === 'temperature' && (
          <TemperatureGradient results={results} />
        )}

        {/* Advanced views */}
        {viewMode === 'entropy' && (
          <EntropyCurve results={results} />
        )}
        {viewMode === 'heatmap' && (
          <ModelDivergenceHeatmap results={results} />
        )}
        {viewMode === 'trajectory' && (
          <WordTrajectory results={results} />
        )}
        {viewMode === 'radial' && (
          <RadialDistribution words={results.topWords} />
        )}
      </div>

      {/* Export */}
      <div className="p-5 border-t border-slate-700 flex items-center gap-3">
        <span className="text-sm text-slate-500">Export:</span>
        <button
          onClick={handleExportCSV}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          CSV
        </button>
        <button
          onClick={handleExportJSON}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          JSON
        </button>
        <button
          onClick={handleExportPNG}
          disabled={isExporting}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'PNG'}
        </button>
      </div>
    </div>
  );
}

function FrequencyTable({ words }: { words: WordFrequency[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-slate-500 border-b border-slate-700">
            <th className="pb-3 font-medium">#</th>
            <th className="pb-3 font-medium">Word</th>
            <th className="pb-3 font-medium text-right">Count</th>
            <th className="pb-3 font-medium text-right">%</th>
            <th className="pb-3 font-medium">Distribution</th>
          </tr>
        </thead>
        <tbody>
          {words.slice(0, 20).map((w, i) => (
            <tr key={w.word} className="border-b border-slate-700/50">
              <td className="py-3 text-slate-500">{i + 1}</td>
              <td className="py-3 font-mono text-white">{w.word}</td>
              <td className="py-3 font-mono text-right text-slate-300">{w.count}</td>
              <td className="py-3 font-mono text-right text-slate-300">
                {w.percentage.toFixed(1)}%
              </td>
              <td className="py-3">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden w-32">
                  <div
                    className="h-full bg-cyan-500"
                    style={{ width: `${w.percentage}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModelComparison({ results }: { results: ExperimentResults }) {
  const modelResults = results.byModel || [];

  if (modelResults.length === 0) {
    return (
      <p className="text-slate-500 text-center py-8">
        Model comparison requires multiple models
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {modelResults.map((mr) => (
        <div key={mr.modelId} className="bg-slate-900 rounded-lg p-4">
          <h4 className="font-medium text-white mb-3 truncate">{mr.modelId}</h4>
          <div className="space-y-1">
            {mr.words.slice(0, 5).map((w, i) => (
              <div key={w.word} className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 w-4">{i + 1}</span>
                <span className="font-mono text-cyan-400">{w.word}</span>
                <span className="text-slate-500 ml-auto">{w.count}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemperatureGradient({ results }: { results: ExperimentResults }) {
  const temps = Object.keys(results.byTemperature || {}).map(Number).sort();

  if (temps.length === 0) {
    return (
      <p className="text-slate-500 text-center py-8">
        Temperature comparison requires multiple temperature values
      </p>
    );
  }

  // Get top words across all temperatures
  const allWords = new Map<string, number>();
  Object.values(results.byTemperature || {}).forEach(words => {
    words.forEach(w => {
      allWords.set(w.word, (allWords.get(w.word) || 0) + w.count);
    });
  });

  const topWords = Array.from(allWords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  // Find max percentage for scaling
  const maxPercentage = Math.max(
    ...Object.values(results.byTemperature || {}).flatMap(words =>
      words.map(w => w.percentage)
    )
  );

  return (
    <div className="space-y-3">
      {/* Temperature labels */}
      <div className="flex items-center">
        <div className="w-28 text-xs text-slate-500 font-medium">Word</div>
        {temps.map((t) => (
          <div key={t} className="flex-1 text-center text-xs font-mono text-slate-400">
            T={t.toFixed(1)}
          </div>
        ))}
      </div>

      {/* Word rows */}
      {topWords.map((word, i) => (
        <div key={word} className="flex items-center group">
          <div className="w-28 font-mono text-sm text-slate-300 truncate" title={word}>
            <span className="text-slate-500 text-xs mr-2">{i + 1}</span>
            {word}
          </div>
          {temps.map((t, ti) => {
            const words = results.byTemperature?.[t] || [];
            const found = words.find((w) => w.word === word);
            const percentage = found?.percentage || 0;
            const width = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0;

            // Color gradient from cool (low temp) to warm (high temp)
            const hue = 180 - (ti / (temps.length - 1 || 1)) * 140; // cyan to orange

            return (
              <div key={t} className="flex-1 px-0.5">
                <div
                  className="h-7 bg-slate-800 rounded overflow-hidden relative group-hover:bg-slate-700 transition-colors"
                  title={`${word} at T=${t.toFixed(1)}: ${percentage.toFixed(1)}%`}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${width}%`,
                      backgroundColor: `hsl(${hue}, 70%, 50%)`,
                    }}
                  />
                  {percentage > 0 && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white/70">
                      {percentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Entropy row */}
      <div className="flex items-center mt-4 pt-4 border-t border-slate-700">
        <div className="w-28 text-xs text-slate-400">Unique words</div>
        {temps.map((t) => {
          const words = results.byTemperature?.[t] || [];
          const uniqueCount = words.length;
          return (
            <div key={t} className="flex-1 text-center text-sm font-mono text-amber-400">
              {uniqueCount}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 text-center mt-2">
        Higher temperature → more diverse outputs (higher entropy)
      </p>
    </div>
  );
}
