import type { Provider } from '../../../lib/types';

interface EmptyStateProps {
  providers: Provider[];
  onAddKey: (providerId: string) => void;
}

export function EmptyState({ providers, onAddKey }: EmptyStateProps) {
  return (
    <div className="text-center py-12 space-y-10">
      {/* Hero icon - key with orbital rings */}
      <div className="relative w-24 h-24 mx-auto">
        {/* Outer orbital ring */}
        <div
          className="absolute inset-0 rounded-full border border-dashed animate-orbit"
          style={{
            borderColor: 'var(--brass-dim)',
            animationDuration: '20s',
          }}
        />
        {/* Middle ring */}
        <div
          className="absolute inset-3 rounded-full border"
          style={{ borderColor: 'var(--ink-border)' }}
        />
        {/* Inner glow */}
        <div
          className="absolute inset-6 rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--brass-glow) 0%, transparent 70%)',
          }}
        />
        {/* Key icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: 'var(--brass)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>
      </div>

      {/* Title & description */}
      <div className="space-y-3 max-w-md mx-auto">
        <h1 className="font-display text-3xl" style={{ color: 'var(--text-primary)' }}>
          Bring Your Own Keys
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          One Word connects directly to AI providers using your API keys.
          Your keys are stored locally and never sent to our servers.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          You only pay for what you use, directly to the provider.
        </p>
      </div>

      {/* Provider grid */}
      <div className="grid gap-4 sm:grid-cols-3 max-w-lg mx-auto stagger-children">
        {providers.map((provider, i) => (
          <button
            key={provider.id}
            onClick={() => onAddKey(provider.id)}
            className="obs-card p-5 text-center group"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="relative z-10">
              <div
                className="obs-provider-badge brass mx-auto mb-3 transition-transform group-hover:scale-110"
              >
                {provider.name.charAt(0)}
              </div>
              <p
                className="font-medium text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                {provider.name}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {provider.models.length} models
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Security note */}
      <div
        className="obs-surface p-5 max-w-md mx-auto animate-fade-in-up"
        style={{ animationDelay: '300ms' }}
      >
        <div className="flex items-start gap-4 text-left">
          <div
            className="obs-status-dot success mt-1 flex-shrink-0"
            style={{ width: 12, height: 12 }}
          />
          <div>
            <p
              className="font-medium text-sm"
              style={{ color: 'var(--text-primary)' }}
            >
              Your keys stay private
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              API calls go directly from your browser to the provider.
              We never see or store your keys.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
