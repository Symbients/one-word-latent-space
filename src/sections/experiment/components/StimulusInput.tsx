import { useState } from 'react';
import type { Stimulus } from '../../../lib/types';

interface StimulusInputProps {
  value: string;
  onChange: (value: string) => void;
}

const STIMULI: Stimulus[] = [
  { id: 'existential-1', text: 'the word that scares me most in the world is', category: 'existential', isBuiltIn: true },
  { id: 'existential-2', text: 'when I think about death, the first word that comes to mind is', category: 'existential', isBuiltIn: true },
  { id: 'identity-1', text: 'if I had to describe myself in one word, it would be', category: 'identity', isBuiltIn: true },
  { id: 'creative-1', text: 'if colors had tastes, blue would taste like', category: 'creative', isBuiltIn: true },
  { id: 'creative-2', text: 'the sound of the universe expanding is', category: 'creative', isBuiltIn: true },
  { id: 'memory-1', text: 'my earliest memory feels like the word', category: 'memory', isBuiltIn: true },
  { id: 'future-1', text: 'in one hundred years, the world will be', category: 'future', isBuiltIn: true },
  { id: 'future-2', text: 'the first word aliens would teach humans is', category: 'future', isBuiltIn: true },
];

export function StimulusInput({ value, onChange }: StimulusInputProps) {
  const [showLibrary, setShowLibrary] = useState(false);

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="obs-etched">Stimulus</label>
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className="obs-button-ghost text-sm"
        >
          {showLibrary ? 'Close' : 'Library'}
        </button>
      </div>

      {/* Input - the focal point */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="the word that scares me most in the world is"
          rows={3}
          className="obs-input w-full px-4 py-3 rounded text-base resize-none"
          style={{
            fontStyle: value ? 'normal' : 'italic',
          }}
        />
        {/* Cursor indicator when empty */}
        {!value && (
          <span
            className="absolute top-3 left-4 pointer-events-none animate-cursor font-mono"
            style={{ color: 'var(--brass)' }}
          >
            ▌
          </span>
        )}
      </div>

      {/* System prompt hint */}
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        The model will complete with exactly one word.
      </p>

      {/* Library */}
      {showLibrary && (
        <div
          className="obs-surface p-4 rounded space-y-4 animate-emerge"
        >
          <p className="obs-etched">Select a prompt</p>
          <div className="space-y-2">
            {STIMULI.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  onChange(s.text);
                  setShowLibrary(false);
                }}
                className="w-full text-left px-4 py-3 rounded transition-all hover:translate-x-1"
                style={{
                  background: 'var(--ink-deepest)',
                  color: 'var(--text-secondary)',
                  borderLeft: '2px solid transparent',
                  animationDelay: `${i * 50}ms`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderLeftColor = 'var(--brass)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderLeftColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <span className="font-display italic">{s.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
