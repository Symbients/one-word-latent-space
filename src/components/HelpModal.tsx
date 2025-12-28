import { useEffect, useRef } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto obs-backdrop"
      style={{ animation: 'fadeInUp 0.2s ease-out' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="min-h-full flex items-center justify-center p-8">
        <div
          ref={modalRef}
          className="obs-modal max-w-2xl w-full max-h-[75vh] overflow-hidden animate-scale-in flex flex-col my-8"
        >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--ink-border)' }}
        >
          <div className="flex items-center gap-3">
            {/* Mini orbital logo */}
            <div className="relative w-8 h-8">
              <div
                className="absolute inset-0 rounded-full border"
                style={{ borderColor: 'var(--ink-border)' }}
              />
              <div
                className="absolute inset-1.5 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 35% 35%, var(--brass-bright), var(--brass-dim))',
                }}
              />
            </div>
            <h2
              className="font-display text-xl"
              style={{ color: 'var(--text-primary)' }}
            >
              One Word
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: 'var(--ink-deepest)',
              color: 'var(--text-tertiary)',
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6" style={{ maxHeight: 'calc(80vh - 130px)' }}>
          {/* What is this */}
          <section>
            <h3 className="obs-accent font-medium mb-2">What is this?</h3>
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed">
              One Word explores the <span style={{ color: 'var(--text-primary)' }} className="font-medium">latent space</span> of
              large language models by constraining them to single-word completions. Given a stimulus
              like "The meaning of life is...", what word does each model choose? How does temperature
              affect diversity? What patterns emerge across thousands of samples?
            </p>
          </section>

          {/* How it works */}
          <section>
            <h3 className="obs-accent font-medium mb-2">How it works</h3>
            <ol style={{ color: 'var(--text-secondary)' }} className="text-sm space-y-2 list-decimal list-inside">
              <li>Add your API keys (stored locally in your browser, never sent to our servers)</li>
              <li>Enter a stimulus prompt ending with "..."</li>
              <li>Select models and configure temperature/topK ranges</li>
              <li>Run the experiment and watch words stream in</li>
              <li>Explore results through various visualizations</li>
            </ol>
          </section>

          {/* Key concepts */}
          <section>
            <h3 className="obs-accent font-medium mb-2">Key Concepts</h3>
            <div className="grid gap-3 text-sm">
              <div
                className="rounded p-4"
                style={{ background: 'var(--ink-deepest)', border: '1px solid var(--ink-border)' }}
              >
                <span className="font-mono" style={{ color: 'var(--brass)' }}>Temperature</span>
                <p style={{ color: 'var(--text-tertiary)' }} className="mt-1">
                  Controls randomness. Low (0.0) = deterministic, always picks the most likely word.
                  High (1.5+) = creative, explores less probable options.
                </p>
              </div>
              <div
                className="rounded p-4"
                style={{ background: 'var(--ink-deepest)', border: '1px solid var(--ink-border)' }}
              >
                <span className="font-mono" style={{ color: 'var(--brass)' }}>Top-K</span>
                <p style={{ color: 'var(--text-tertiary)' }} className="mt-1">
                  Limits sampling to the K most likely tokens. Lower K = more focused vocabulary,
                  higher K = broader exploration.
                </p>
              </div>
              <div
                className="rounded p-4"
                style={{ background: 'var(--ink-deepest)', border: '1px solid var(--ink-border)' }}
              >
                <span className="font-mono" style={{ color: 'var(--brass)' }}>Entropy</span>
                <p style={{ color: 'var(--text-tertiary)' }} className="mt-1">
                  Measures diversity in bits. Higher entropy = more varied responses across samples.
                  A model that always says the same word has zero entropy.
                </p>
              </div>
            </div>
          </section>

          {/* Visualizations */}
          <section>
            <h3 className="obs-accent font-medium mb-2">Visualizations</h3>
            <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <div><span style={{ color: 'var(--text-primary)' }}>Cloud</span> — Interactive word cloud</div>
              <div><span style={{ color: 'var(--text-primary)' }}>Table</span> — Frequency breakdown</div>
              <div><span style={{ color: 'var(--text-primary)' }}>Models</span> — Per-model comparison</div>
              <div><span style={{ color: 'var(--text-primary)' }}>Temp Grid</span> — Temperature heatmap</div>
              <div><span style={{ color: 'var(--text-primary)' }}>Entropy</span> — Entropy curve</div>
              <div><span style={{ color: 'var(--text-primary)' }}>Similarity</span> — Model divergence</div>
              <div><span style={{ color: 'var(--text-primary)' }}>Trajectory</span> — Word paths</div>
              <div><span style={{ color: 'var(--text-primary)' }}>Radial</span> — Pie distribution</div>
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h3 className="obs-accent font-medium mb-2">Privacy</h3>
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed">
              <span style={{ color: 'var(--success)' }}>BYOK (Bring Your Own Keys)</span> — Your API keys are stored
              in your browser's localStorage and sent directly to the AI providers. We never see or store them.
              Experiment results can optionally be shared anonymously to help build community insights.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div
          className="p-4 flex items-center justify-between text-sm"
          style={{ borderTop: '1px solid var(--ink-border)' }}
        >
          <span style={{ color: 'var(--text-tertiary)' }}>
            Press <kbd
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: 'var(--ink-deepest)', border: '1px solid var(--ink-border)' }}
            >Esc</kbd> to close
          </span>
          <a
            href="https://github.com/anthropics/one-word"
            target="_blank"
            rel="noopener noreferrer"
            className="obs-button-ghost"
          >
            View on GitHub
          </a>
        </div>
        </div>
      </div>
    </div>
  );
}
