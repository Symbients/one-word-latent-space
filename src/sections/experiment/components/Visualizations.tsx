/**
 * One Word - High-Touch Visualizations
 *
 * Rich, interactive visualizations for exploring AI latent space.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { ExperimentResults, WordFrequency, RunProgress } from '../../../lib/types';

// ==================== Interactive Word Cloud ====================

interface InteractiveCloudProps {
  words: WordFrequency[];
  onWordClick?: (word: string) => void;
}

export function InteractiveWordCloud({ words, onWordClick }: InteractiveCloudProps) {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const maxCount = words[0]?.count || 1;

  // Arrange words in a spiral pattern
  const arrangedWords = useMemo(() => {
    return words.slice(0, 40).map((w, i) => {
      const angle = i * 0.5;
      const radius = 20 + i * 8;
      const x = 50 + Math.cos(angle) * radius * 0.4;
      const y = 50 + Math.sin(angle) * radius * 0.3;
      const size = 0.7 + (w.count / maxCount) * 1.8;
      const opacity = 0.4 + (w.count / maxCount) * 0.6;
      const rotation = (Math.random() - 0.5) * 10;

      return { ...w, x, y, size, opacity, rotation };
    });
  }, [words, maxCount]);

  return (
    <div className="relative w-full h-80 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden">
      {/* Ambient glow effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-cyan-500 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-amber-500 rounded-full blur-3xl" />
      </div>

      {/* Words */}
      <div className="relative w-full h-full">
        {arrangedWords.map((w) => {
          const isHovered = hoveredWord === w.word;
          const isSelected = selectedWord === w.word;

          return (
            <button
              key={w.word}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 cursor-pointer font-mono"
              style={{
                left: `${w.x}%`,
                top: `${w.y}%`,
                fontSize: `${w.size}rem`,
                opacity: isHovered || isSelected ? 1 : w.opacity,
                transform: `translate(-50%, -50%) rotate(${w.rotation}deg) scale(${isHovered ? 1.2 : 1})`,
                color: isSelected ? '#fbbf24' : isHovered ? '#22d3ee' : '#67e8f9',
                textShadow: isHovered ? '0 0 20px rgba(34, 211, 238, 0.5)' : 'none',
                zIndex: isHovered ? 10 : 1,
              }}
              onMouseEnter={() => setHoveredWord(w.word)}
              onMouseLeave={() => setHoveredWord(null)}
              onClick={() => {
                setSelectedWord(w.word === selectedWord ? null : w.word);
                onWordClick?.(w.word);
              }}
            >
              {w.word}
            </button>
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredWord && (
        <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-700">
          <span className="font-mono text-cyan-400">{hoveredWord}</span>
          <span className="text-slate-400 ml-2">
            {arrangedWords.find(w => w.word === hoveredWord)?.count} occurrences
            ({arrangedWords.find(w => w.word === hoveredWord)?.percentage.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  );
}

// ==================== Entropy Curve ====================

interface EntropyCurveProps {
  results: ExperimentResults;
}

export function EntropyCurve({ results }: EntropyCurveProps) {
  const temps = Object.keys(results.byTemperature || {}).map(Number).sort();

  if (temps.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        Entropy curve requires multiple temperature values
      </div>
    );
  }

  // Calculate entropy for each temperature
  const entropyData = temps.map(temp => {
    const words = results.byTemperature?.[temp] || [];
    const totalCount = words.reduce((sum, w) => sum + w.count, 0);

    if (totalCount === 0) return { temp, entropy: 0, uniqueWords: 0 };

    const entropy = -words.reduce((sum, w) => {
      const p = w.count / totalCount;
      return sum + (p > 0 ? p * Math.log2(p) : 0);
    }, 0);

    return { temp, entropy, uniqueWords: words.length };
  });

  const maxEntropy = Math.max(...entropyData.map(d => d.entropy), 1);
  const maxUnique = Math.max(...entropyData.map(d => d.uniqueWords), 1);

  // SVG dimensions
  const width = 100;
  const height = 60;
  const padding = 5;

  // Generate path
  const entropyPath = entropyData.map((d, i) => {
    const x = padding + (i / (entropyData.length - 1)) * (width - 2 * padding);
    const y = height - padding - (d.entropy / maxEntropy) * (height - 2 * padding);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const uniquePath = entropyData.map((d, i) => {
    const x = padding + (i / (entropyData.length - 1)) * (width - 2 * padding);
    const y = height - padding - (d.uniqueWords / maxUnique) * (height - 2 * padding);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-white">Entropy vs Temperature</h4>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-cyan-400 rounded" />
            <span className="text-slate-400">Entropy</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-400 rounded" />
            <span className="text-slate-400">Unique words</span>
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(p => (
          <line
            key={p}
            x1={padding}
            y1={height - padding - p * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - p * (height - 2 * padding)}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="0.5"
          />
        ))}

        {/* Entropy line */}
        <path
          d={entropyPath}
          fill="none"
          stroke="url(#entropyGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Unique words line */}
        <path
          d={uniquePath}
          fill="none"
          stroke="url(#uniqueGradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3,2"
        />

        {/* Data points */}
        {entropyData.map((d, i) => {
          const x = padding + (i / (entropyData.length - 1)) * (width - 2 * padding);
          const y = height - padding - (d.entropy / maxEntropy) * (height - 2 * padding);
          return (
            <circle
              key={d.temp}
              cx={x}
              cy={y}
              r="2"
              fill="#22d3ee"
              className="hover:r-3 transition-all"
            >
              <title>T={d.temp.toFixed(1)}: {d.entropy.toFixed(2)} bits</title>
            </circle>
          );
        })}

        {/* Gradients */}
        <defs>
          <linearGradient id="entropyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="uniqueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between px-1 text-xs font-mono text-slate-500 mt-1">
        {temps.map(t => (
          <span key={t}>{t.toFixed(1)}</span>
        ))}
      </div>
    </div>
  );
}

// ==================== Model Divergence Heatmap ====================

interface DivergenceHeatmapProps {
  results: ExperimentResults;
}

export function ModelDivergenceHeatmap({ results }: DivergenceHeatmapProps) {
  const models = results.byModel || [];

  if (models.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        Heatmap requires multiple models
      </div>
    );
  }

  // Calculate Jaccard similarity between models
  const similarity = useMemo(() => {
    const matrix: number[][] = [];

    for (let i = 0; i < models.length; i++) {
      matrix[i] = [];
      const wordsA = new Set(models[i].words.slice(0, 20).map(w => w.word));

      for (let j = 0; j < models.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const wordsB = new Set(models[j].words.slice(0, 20).map(w => w.word));
          const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
          const union = new Set([...wordsA, ...wordsB]);
          matrix[i][j] = intersection.size / union.size;
        }
      }
    }

    return matrix;
  }, [models]);

  // Get short model names
  const getShortName = (id: string) => {
    return id.replace('claude-', '').replace('gpt-', '').slice(0, 12);
  };

  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <h4 className="text-sm font-medium text-white mb-4">Model Similarity Matrix</h4>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Header row */}
          <div className="flex">
            <div className="w-24" />
            {models.map(m => (
              <div
                key={m.modelId}
                className="w-16 text-xs text-slate-400 text-center truncate px-1"
                title={m.modelId}
              >
                {getShortName(m.modelId)}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {models.map((m, i) => (
            <div key={m.modelId} className="flex items-center">
              <div
                className="w-24 text-xs text-slate-400 truncate pr-2"
                title={m.modelId}
              >
                {getShortName(m.modelId)}
              </div>
              {similarity[i].map((value, j) => {
                // Color from cyan (similar) to slate (different)
                const hue = 180 + (1 - value) * 20;
                const saturation = value * 70;
                const lightness = 30 + value * 20;

                return (
                  <div
                    key={j}
                    className="w-16 h-10 flex items-center justify-center text-xs font-mono transition-transform hover:scale-110 cursor-default"
                    style={{
                      backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                    }}
                    title={`${getShortName(models[i].modelId)} vs ${getShortName(models[j].modelId)}: ${(value * 100).toFixed(0)}% similar`}
                  >
                    <span className="text-white/80">{(value * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-3">
        Jaccard similarity of top 20 words. Higher = more similar vocabulary.
      </p>
    </div>
  );
}

// ==================== Live Word Stream ====================

interface LiveWordStreamProps {
  progress: RunProgress | null;
}

export function LiveWordStream({ progress }: LiveWordStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayedWords, setDisplayedWords] = useState<Array<{
    word: string;
    id: number;
    x: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    if (!progress?.recentWords) return;

    const newWords = progress.recentWords.slice(0, 5).map((word, i) => ({
      word,
      id: Date.now() + i,
      x: 10 + Math.random() * 80,
      delay: i * 0.1,
    }));

    setDisplayedWords(prev => [...newWords, ...prev].slice(0, 30));
  }, [progress?.recentWords.join(',')]);

  if (!progress) {
    return (
      <div className="h-48 bg-slate-900 rounded-xl flex items-center justify-center text-slate-500">
        Run an experiment to see words appear...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-48 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden relative"
    >
      {/* Animated words falling */}
      {displayedWords.map(({ word, id, x, delay }) => (
        <div
          key={id}
          className="absolute font-mono text-cyan-400 animate-fall"
          style={{
            left: `${x}%`,
            animationDelay: `${delay}s`,
            textShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
          }}
        >
          {word}
        </div>
      ))}

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-800 to-transparent" />

      {/* Stats overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between text-xs text-slate-400">
        <span>
          <span className="font-mono text-cyan-400">{progress.completedCalls}</span>
          {' / '}
          <span className="font-mono">{progress.totalCalls}</span>
        </span>
        <span className="font-mono text-amber-400">
          ${progress.runningCost.toFixed(4)}
        </span>
      </div>

      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(200px);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall 4s ease-in forwards;
        }
      `}</style>
    </div>
  );
}

// ==================== Word Trajectory ====================

interface WordTrajectoryProps {
  results: ExperimentResults;
  selectedWords?: string[];
}

export function WordTrajectory({ results, selectedWords }: WordTrajectoryProps) {
  const temps = Object.keys(results.byTemperature || {}).map(Number).sort();

  // Get top 5 words to track if not specified
  const wordsToTrack = selectedWords || results.topWords.slice(0, 5).map(w => w.word);

  if (temps.length < 2 || wordsToTrack.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        Word trajectory requires multiple temperatures
      </div>
    );
  }

  // Colors for each word
  const colors = ['#22d3ee', '#a78bfa', '#34d399', '#fb923c', '#f472b6'];

  // Calculate trajectories
  const trajectories = wordsToTrack.map((word, wordIdx) => {
    return temps.map((temp, tempIdx) => {
      const words = results.byTemperature?.[temp] || [];
      const found = words.find(w => w.word === word);
      return {
        temp,
        tempIdx,
        percentage: found?.percentage || 0,
        word,
        color: colors[wordIdx % colors.length],
      };
    });
  });

  const maxPercentage = Math.max(
    ...trajectories.flat().map(t => t.percentage),
    1
  );

  // SVG dimensions
  const width = 100;
  const height = 50;
  const padding = 5;

  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <h4 className="text-sm font-medium text-white mb-4">Word Trajectories Across Temperature</h4>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        {/* Grid */}
        {[0.25, 0.5, 0.75].map(p => (
          <line
            key={p}
            x1={padding}
            y1={height - padding - p * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - p * (height - 2 * padding)}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="0.3"
          />
        ))}

        {/* Trajectory lines */}
        {trajectories.map((trajectory, i) => {
          const path = trajectory.map((point, j) => {
            const x = padding + (j / (temps.length - 1)) * (width - 2 * padding);
            const y = height - padding - (point.percentage / maxPercentage) * (height - 2 * padding);
            return `${j === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ');

          return (
            <g key={i}>
              <path
                d={path}
                fill="none"
                stroke={trajectory[0].color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
              {trajectory.map((point, j) => {
                const x = padding + (j / (temps.length - 1)) * (width - 2 * padding);
                const y = height - padding - (point.percentage / maxPercentage) * (height - 2 * padding);
                return (
                  <circle
                    key={j}
                    cx={x}
                    cy={y}
                    r="1.5"
                    fill={point.color}
                  >
                    <title>{point.word}: {point.percentage.toFixed(1)}% at T={point.temp}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {wordsToTrack.map((word, i) => (
          <span key={word} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="font-mono text-slate-300">{word}</span>
          </span>
        ))}
      </div>

      {/* X-axis */}
      <div className="flex justify-between px-1 text-xs font-mono text-slate-500 mt-2">
        {temps.map(t => (
          <span key={t}>T={t.toFixed(1)}</span>
        ))}
      </div>
    </div>
  );
}

// ==================== Radial Word Distribution ====================

interface RadialDistributionProps {
  words: WordFrequency[];
  title?: string;
}

export function RadialDistribution({ words, title = 'Word Distribution' }: RadialDistributionProps) {
  const topWords = words.slice(0, 12);
  const total = topWords.reduce((sum, w) => sum + w.count, 0);

  // Generate pie segments
  let currentAngle = -90; // Start from top

  const segments = topWords.map((w, i) => {
    const angle = (w.count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Calculate arc path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const radius = 40;
    const cx = 50;
    const cy = 50;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    // Label position
    const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
    const labelRadius = radius + 8;
    const labelX = cx + labelRadius * Math.cos(midAngle);
    const labelY = cy + labelRadius * Math.sin(midAngle);

    // Color based on index
    const hue = 180 + i * 15;

    return {
      ...w,
      path,
      labelX,
      labelY,
      midAngle: (startAngle + endAngle) / 2,
      color: `hsl(${hue}, 60%, 50%)`,
    };
  });

  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <h4 className="text-sm font-medium text-white mb-4">{title}</h4>

      <svg viewBox="0 0 100 100" className="w-full max-w-xs mx-auto">
        {/* Segments */}
        {segments.map((seg) => (
          <g key={seg.word}>
            <path
              d={seg.path}
              fill={seg.color}
              stroke="#0f172a"
              strokeWidth="0.5"
              className="transition-all duration-200 hover:opacity-80 cursor-pointer"
            >
              <title>{seg.word}: {seg.count} ({seg.percentage.toFixed(1)}%)</title>
            </path>
            {seg.percentage > 5 && (
              <text
                x={seg.labelX}
                y={seg.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-300 text-[3px] font-mono pointer-events-none"
              >
                {seg.word.slice(0, 6)}
              </text>
            )}
          </g>
        ))}

        {/* Center label */}
        <circle cx="50" cy="50" r="18" fill="#0f172a" />
        <text
          x="50"
          y="48"
          textAnchor="middle"
          className="fill-slate-400 text-[4px]"
        >
          {topWords.length}
        </text>
        <text
          x="50"
          y="54"
          textAnchor="middle"
          className="fill-slate-500 text-[2.5px]"
        >
          words
        </text>
      </svg>
    </div>
  );
}
