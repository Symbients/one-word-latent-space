interface ParameterDialsProps {
  // Temperature
  temperatureMode: 'single' | 'range';
  temperatureSingle: number;
  temperatureMin: number;
  temperatureMax: number;
  temperatureSteps: number;
  onTemperatureModeChange: (mode: 'single' | 'range') => void;
  onTemperatureSingleChange: (value: number) => void;
  onTemperatureMinChange: (value: number) => void;
  onTemperatureMaxChange: (value: number) => void;
  onTemperatureStepsChange: (value: number) => void;
  // Top-K
  topKMode: 'single' | 'range';
  topKSingle: number;
  topKMin: number;
  topKMax: number;
  topKSteps: number;
  onTopKModeChange: (mode: 'single' | 'range') => void;
  onTopKSingleChange: (value: number) => void;
  onTopKMinChange: (value: number) => void;
  onTopKMaxChange: (value: number) => void;
  onTopKStepsChange: (value: number) => void;
  // Samples
  samples: number;
  onSamplesChange: (value: number) => void;
}

export function ParameterDials({
  temperatureMode,
  temperatureSingle,
  temperatureMin,
  temperatureMax,
  temperatureSteps,
  onTemperatureModeChange,
  onTemperatureSingleChange,
  onTemperatureMinChange,
  onTemperatureMaxChange,
  onTemperatureStepsChange,
  topKMode,
  topKSingle,
  topKMin,
  topKMax,
  topKSteps,
  onTopKModeChange,
  onTopKSingleChange,
  onTopKMinChange,
  onTopKMaxChange,
  onTopKStepsChange,
  samples,
  onSamplesChange,
}: ParameterDialsProps) {
  return (
    <div className="space-y-8">
      <p className="obs-etched text-center">Observation Parameters</p>

      {/* Temperature */}
      <RangeParameter
        label="Temperature"
        note="Anthropic capped at 1.0"
        mode={temperatureMode}
        singleValue={temperatureSingle}
        minValue={temperatureMin}
        maxValue={temperatureMax}
        steps={temperatureSteps}
        bounds={{ min: 0, max: 2, step: 0.1 }}
        format={(v) => v.toFixed(1)}
        onModeChange={onTemperatureModeChange}
        onSingleChange={onTemperatureSingleChange}
        onMinChange={onTemperatureMinChange}
        onMaxChange={onTemperatureMaxChange}
        onStepsChange={onTemperatureStepsChange}
      />

      {/* Top-K */}
      <RangeParameter
        label="Top-K"
        mode={topKMode}
        singleValue={topKSingle}
        minValue={topKMin}
        maxValue={topKMax}
        steps={topKSteps}
        bounds={{ min: 1, max: 100, step: 1 }}
        format={(v) => v.toString()}
        onModeChange={onTopKModeChange}
        onSingleChange={onTopKSingleChange}
        onMinChange={onTopKMinChange}
        onMaxChange={onTopKMaxChange}
        onStepsChange={onTopKStepsChange}
      />

      {/* Samples - always single value */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="obs-etched">Samples</span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>
              (per configuration)
            </span>
          </div>
          <span className="font-mono text-lg tabular-nums" style={{ color: 'var(--brass)' }}>
            {samples}
          </span>
        </div>
        <SliderTrack
          value={samples}
          min={10}
          max={1000}
          step={10}
          onChange={onSamplesChange}
        />
        <div className="flex justify-between px-1">
          {[10, 100, 250, 500, 1000].map((mark) => (
            <button
              key={mark}
              onClick={() => onSamplesChange(mark)}
              className="text-xs transition-colors hover:text-[var(--brass)]"
              style={{ color: samples === mark ? 'var(--brass)' : 'var(--text-tertiary)' }}
            >
              {mark}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface RangeParameterProps {
  label: string;
  note?: string;
  mode: 'single' | 'range';
  singleValue: number;
  minValue: number;
  maxValue: number;
  steps: number;
  bounds: { min: number; max: number; step: number };
  format: (value: number) => string;
  onModeChange: (mode: 'single' | 'range') => void;
  onSingleChange: (value: number) => void;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  onStepsChange: (value: number) => void;
}

function RangeParameter({
  label,
  note,
  mode,
  singleValue,
  minValue,
  maxValue,
  steps,
  bounds,
  format,
  onModeChange,
  onSingleChange,
  onMinChange,
  onMaxChange,
  onStepsChange,
}: RangeParameterProps) {
  return (
    <div className="space-y-4">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between">
        <div>
          <span className="obs-etched">{label}</span>
          {note && (
            <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>
              ({note})
            </span>
          )}
        </div>
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>

      {mode === 'single' ? (
        /* Single value mode */
        <div className="space-y-3">
          <div className="flex justify-end">
            <span className="font-mono text-lg tabular-nums" style={{ color: 'var(--brass)' }}>
              {format(singleValue)}
            </span>
          </div>
          <SliderTrack
            value={singleValue}
            min={bounds.min}
            max={bounds.max}
            step={bounds.step}
            onChange={onSingleChange}
          />
        </div>
      ) : (
        /* Range mode */
        <div className="space-y-4">
          {/* Min/Max display */}
          <div className="flex items-center justify-between px-1">
            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Min</p>
              <span className="font-mono text-lg tabular-nums" style={{ color: 'var(--brass)' }}>
                {format(minValue)}
              </span>
            </div>
            <div
              className="flex-1 mx-4 h-px"
              style={{ background: 'var(--ink-border)' }}
            />
            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Max</p>
              <span className="font-mono text-lg tabular-nums" style={{ color: 'var(--brass)' }}>
                {format(maxValue)}
              </span>
            </div>
          </div>

          {/* Dual range visualization */}
          <DualSliderTrack
            minValue={minValue}
            maxValue={maxValue}
            min={bounds.min}
            max={bounds.max}
            step={bounds.step}
            onMinChange={onMinChange}
            onMaxChange={onMaxChange}
          />

          {/* Steps input */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Steps
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onStepsChange(Math.max(2, steps - 1))}
                className="w-6 h-6 rounded flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: 'var(--ink-deepest)',
                  border: '1px solid var(--ink-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                -
              </button>
              <span
                className="font-mono text-lg w-8 text-center"
                style={{ color: 'var(--brass)' }}
              >
                {steps}
              </span>
              <button
                onClick={() => onStepsChange(Math.min(20, steps + 1))}
                className="w-6 h-6 rounded flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: 'var(--ink-deepest)',
                  border: '1px solid var(--ink-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Preview values - visually distinct chips */}
          <div className="flex flex-wrap gap-1.5 pt-3">
            {Array.from({ length: steps }, (_, i) => {
              const value = minValue + (maxValue - minValue) * (i / (steps - 1));
              const isFirst = i === 0;
              const isLast = i === steps - 1;
              return (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs font-mono"
                  style={{
                    background: isFirst || isLast
                      ? 'linear-gradient(135deg, rgba(201, 165, 92, 0.15), rgba(139, 115, 64, 0.1))'
                      : 'transparent',
                    borderRadius: '2px',
                    color: isFirst || isLast ? 'var(--brass)' : 'var(--text-tertiary)',
                  }}
                >
                  {format(value)}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: 'single' | 'range';
  onChange: (mode: 'single' | 'range') => void;
}) {
  return (
    <div
      className="flex rounded-full p-0.5"
      style={{ background: 'var(--ink-deepest)', border: '1px solid var(--ink-border)' }}
    >
      <button
        onClick={() => onChange('single')}
        className="px-3 py-1 rounded-full text-xs transition-all"
        style={{
          background: mode === 'single' ? 'var(--brass)' : 'transparent',
          color: mode === 'single' ? 'var(--ink-deepest)' : 'var(--text-tertiary)',
        }}
      >
        Single
      </button>
      <button
        onClick={() => onChange('range')}
        className="px-3 py-1 rounded-full text-xs transition-all"
        style={{
          background: mode === 'range' ? 'var(--brass)' : 'transparent',
          color: mode === 'range' ? 'var(--ink-deepest)' : 'var(--text-tertiary)',
        }}
      >
        Range
      </button>
    </div>
  );
}

function SliderTrack({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="relative h-6">
      {/* Track background */}
      <div
        className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full"
        style={{
          background: 'var(--ink-deepest)',
          border: '1px solid var(--ink-border)',
        }}
      />
      {/* Filled portion */}
      <div
        className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full transition-all duration-75"
        style={{
          width: `${percentage}%`,
          background: 'linear-gradient(90deg, var(--brass-dim), var(--brass))',
          boxShadow: '0 0 8px var(--brass-glow)',
        }}
      />
      {/* Input */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="obs-range absolute inset-0 w-full"
      />
    </div>
  );
}

function DualSliderTrack({
  minValue,
  maxValue,
  min,
  max,
  step,
  onMinChange,
  onMaxChange,
}: {
  minValue: number;
  maxValue: number;
  min: number;
  max: number;
  step: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) {
  const minPercent = ((minValue - min) / (max - min)) * 100;
  const maxPercent = ((maxValue - min) / (max - min)) * 100;

  return (
    <div className="relative h-6">
      {/* Track background */}
      <div
        className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full"
        style={{
          background: 'var(--ink-deepest)',
          border: '1px solid var(--ink-border)',
        }}
      />
      {/* Selected range */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full transition-all duration-75"
        style={{
          left: `${minPercent}%`,
          width: `${maxPercent - minPercent}%`,
          background: 'linear-gradient(90deg, var(--brass-dim), var(--brass))',
          boxShadow: '0 0 8px var(--brass-glow)',
        }}
      />
      {/* Min slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={minValue}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          if (val < maxValue) onMinChange(val);
        }}
        className="obs-range absolute inset-0 w-full"
        style={{ zIndex: minValue > max - (max - min) * 0.1 ? 5 : 3 }}
      />
      {/* Max slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={maxValue}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          if (val > minValue) onMaxChange(val);
        }}
        className="obs-range absolute inset-0 w-full"
        style={{ zIndex: 4 }}
      />
    </div>
  );
}
