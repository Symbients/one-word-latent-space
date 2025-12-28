import type { RunProgress } from '../../../lib/types';

interface ObservationProgressProps {
  progress: RunProgress;
  stimulus: string;
  onStop: () => void;
}

export function ObservationProgress({ progress, stimulus, onStop }: ObservationProgressProps) {
  const percentage = Math.round((progress.completedCalls / progress.totalCalls) * 100);
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const formatTime = (ms: number): string => {
    if (!isFinite(ms) || ms <= 0) return '—';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      const remainingSecs = seconds % 60;
      return remainingSecs > 0 ? `${minutes}:${remainingSecs.toString().padStart(2, '0')}` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  return (
    <div className="text-center space-y-8">
      {/* The stimulus being observed */}
      <div className="space-y-2">
        <p className="obs-etched">Observing Response To</p>
        <p
          className="font-display text-xl italic max-w-md mx-auto"
          style={{ color: 'var(--text-secondary)' }}
        >
          "{stimulus}"
        </p>
      </div>

      {/* Orbital progress ring */}
      <div className="relative w-48 h-48 mx-auto">
        <svg className="w-full h-full progress-ring" viewBox="0 0 180 180">
          {/* Outer decorative ring */}
          <circle
            cx="90"
            cy="90"
            r="88"
            fill="none"
            stroke="var(--ink-border)"
            strokeWidth="0.5"
          />
          {/* Track ring */}
          <circle
            className="progress-ring-circle"
            cx="90"
            cy="90"
            r="80"
          />
          {/* Progress arc */}
          <circle
            className="progress-ring-progress"
            cx="90"
            cy="90"
            r="80"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: 'drop-shadow(0 0 8px var(--brass-glow))',
            }}
          />
          {/* Inner decorative ring */}
          <circle
            cx="90"
            cy="90"
            r="70"
            fill="none"
            stroke="var(--ink-border)"
            strokeWidth="0.5"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-3xl"
            style={{ color: 'var(--brass)' }}
          >
            {percentage}%
          </span>
          <span className="obs-etched mt-1">
            {progress.completedCalls.toLocaleString()} / {progress.totalCalls.toLocaleString()}
          </span>
        </div>

        {/* Orbiting indicator */}
        <div
          className="absolute w-3 h-3 rounded-full animate-orbit"
          style={{
            top: '50%',
            left: '50%',
            marginTop: '-80px',
            marginLeft: '-6px',
            background: 'var(--brass)',
            boxShadow: '0 0 12px var(--brass-glow)',
            transformOrigin: '6px 80px',
          }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-8">
        <div className="text-center">
          <p className="obs-etched mb-1">Time Remaining</p>
          <p className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {formatTime(progress.estimatedTimeRemaining)}
          </p>
        </div>
        <div className="text-center">
          <p className="obs-etched mb-1">Cost</p>
          <p className="font-mono" style={{ color: 'var(--brass)' }}>
            ${progress.runningCost.toFixed(3)}
          </p>
        </div>
        <div className="text-center">
          <p className="obs-etched mb-1">Current Model</p>
          <p className="font-mono text-sm truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>
            {progress.currentModel || '—'}
          </p>
        </div>
      </div>

      {/* Stop button */}
      <button
        onClick={onStop}
        className="obs-button-ghost px-6 py-2 rounded"
        style={{
          border: '1px solid var(--error)',
          color: 'var(--error)',
        }}
      >
        Abort Observation
      </button>
    </div>
  );
}
