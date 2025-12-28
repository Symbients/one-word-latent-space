import { type ReactNode, useState, useEffect } from 'react';

interface AppShellProps {
  children: ReactNode;
  currentSection: 'keys' | 'experiment';
  keysConfigured: boolean;
  apiStatus: 'connected' | 'error' | 'unknown';
  isRunning?: boolean;
  onNavigate: (section: 'keys' | 'experiment') => void;
  onHelpClick: () => void;
}

export function AppShell({
  children,
  currentSection,
  keysConfigured,
  apiStatus,
  isRunning = false,
  onNavigate,
  onHelpClick,
}: AppShellProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Ambient glow when running */}
      {isRunning && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 20%, rgba(201, 165, 92, 0.1) 0%, transparent 50%)',
          }}
        />
      )}

      {/* Header with glass effect */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'obs-header-glass scrolled' : ''
        }`}
      >
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* Brand */}
          <button
            onClick={() => onNavigate('experiment')}
            className="group flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Orbital logo */}
            <div className="relative w-9 h-9">
              <div
                className="absolute inset-0 rounded-full border transition-colors duration-300"
                style={{
                  borderColor: scrolled ? 'var(--ink-border)' : 'var(--ink-border-subtle)',
                }}
              />
              <div
                className={`absolute inset-1 rounded-full transition-all duration-300 ${
                  isRunning ? 'animate-observe' : ''
                }`}
                style={{
                  background: 'radial-gradient(circle at 35% 35%, var(--brass-bright), var(--brass-dim))',
                  boxShadow: isRunning ? '0 0 20px var(--brass-glow)' : '0 2px 4px rgba(0,0,0,0.2)',
                }}
              />
              {/* Orbital ring */}
              <div
                className="absolute inset-[-4px] rounded-full border border-dashed opacity-20"
                style={{ borderColor: 'var(--brass-dim)' }}
              />
            </div>
            <span
              className="font-display text-xl tracking-tight transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              One Word
            </span>
          </button>

          {/* Right controls */}
          <div className="flex items-center gap-5">
            {/* Running indicator */}
            {isRunning && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--ink-surface)] border border-[var(--brass-dim)]">
                <div
                  className="w-2 h-2 rounded-full animate-observe"
                  style={{ background: 'var(--brass)' }}
                />
                <span
                  className="text-xs font-mono"
                  style={{ color: 'var(--brass)' }}
                >
                  Observing
                </span>
              </div>
            )}

            {/* Nav links */}
            <nav className="flex items-center gap-1 p-1 rounded-lg bg-[var(--ink-surface)] border border-[var(--ink-border-subtle)]">
              <button
                onClick={() => onNavigate('keys')}
                className={`relative px-4 py-2 text-sm rounded transition-all duration-200 ${
                  currentSection === 'keys'
                    ? 'text-[var(--brass)] bg-[var(--ink-elevated)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--ink-base)]'
                }`}
              >
                Keys
                {!keysConfigured && (
                  <span
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-observe"
                    style={{ background: 'var(--warning)' }}
                  />
                )}
              </button>
              <button
                onClick={() => onNavigate('experiment')}
                className={`px-4 py-2 text-sm rounded transition-all duration-200 ${
                  currentSection === 'experiment'
                    ? 'text-[var(--brass)] bg-[var(--ink-elevated)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--ink-base)]'
                }`}
              >
                Observe
              </button>
            </nav>

            {/* GitHub */}
            <a
              href="https://github.com/Symbients/one-word-latent-space"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
              style={{
                background: 'var(--ink-surface)',
                border: '1px solid var(--ink-border)',
                color: 'var(--text-tertiary)',
              }}
              title="View on GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>

            {/* Help */}
            <button
              onClick={onHelpClick}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
              style={{
                background: 'var(--ink-surface)',
                border: '1px solid var(--ink-border)',
                color: 'var(--text-tertiary)',
              }}
            >
              <span className="text-xs font-medium">?</span>
            </button>

            {/* Status indicator */}
            <div className="relative group">
              <div
                className={`obs-status-dot ${
                  apiStatus === 'connected'
                    ? 'success pulse'
                    : apiStatus === 'error'
                    ? 'error'
                    : ''
                }`}
                style={{
                  background:
                    apiStatus === 'connected'
                      ? 'var(--success)'
                      : apiStatus === 'error'
                      ? 'var(--error)'
                      : 'var(--text-tertiary)',
                }}
              />
              {/* Tooltip */}
              <div
                className="absolute right-0 top-full mt-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                style={{
                  background: 'var(--ink-elevated)',
                  border: '1px solid var(--ink-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {apiStatus === 'connected'
                  ? 'Connected'
                  : apiStatus === 'error'
                  ? 'Connection error'
                  : 'Not configured'}
              </div>
            </div>
          </div>
        </div>

        {/* Subtle rule under header - only visible when not scrolled */}
        <div
          className="obs-rule transition-opacity duration-300"
          style={{ opacity: scrolled ? 0 : 1 }}
        />
      </header>

      {/* Main content - centered, focused column */}
      <main className="pt-28 pb-20 min-h-screen">
        <div className="max-w-2xl mx-auto px-6 animate-emerge">
          {children}
        </div>
      </main>

      {/* Footer attribution */}
      <footer
        className="fixed bottom-0 left-0 right-0 py-4 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, var(--ink-deep) 0%, transparent 100%)',
        }}
      >
        <div className="max-w-2xl mx-auto px-6 flex justify-center">
          <p className="obs-etched">
            A precision instrument for linguistic observation
          </p>
        </div>
      </footer>
    </div>
  );
}
