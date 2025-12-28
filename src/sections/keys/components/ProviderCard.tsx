import { useState, useEffect } from 'react';
import type { Provider, ConfiguredKey } from '../../../lib/types';

interface ProviderCardProps {
  provider: Provider;
  configuredKey?: ConfiguredKey;
  onAdd?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onValidate?: () => Promise<boolean>;
  lastValidatedAt?: number; // timestamp of last validation
}

const VALIDATION_COOLDOWN = 30000; // 30 seconds

export function ProviderCard({
  provider,
  configuredKey,
  onAdd,
  onEdit,
  onRemove,
  onValidate,
  lastValidatedAt,
}: ProviderCardProps) {
  const isConfigured = !!configuredKey;
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'success' | 'error' | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Calculate cooldown remaining
  useEffect(() => {
    if (!lastValidatedAt) {
      setCooldownRemaining(0);
      return;
    }

    const updateCooldown = () => {
      const elapsed = Date.now() - lastValidatedAt;
      const remaining = Math.max(0, VALIDATION_COOLDOWN - elapsed);
      setCooldownRemaining(remaining);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastValidatedAt]);

  // Clear validation result after 3 seconds
  useEffect(() => {
    if (validationResult) {
      const timeout = setTimeout(() => setValidationResult(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [validationResult]);

  const handleValidate = async () => {
    if (!onValidate || isValidating || cooldownRemaining > 0) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const success = await onValidate();
      setValidationResult(success ? 'success' : 'error');
    } catch {
      setValidationResult('error');
    } finally {
      setIsValidating(false);
    }
  };

  const isOnCooldown = cooldownRemaining > 0;
  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

  return (
    <div
      className="obs-card p-4 group"
      style={{
        borderColor: isConfigured
          ? configuredKey.isValid
            ? 'var(--ink-border)'
            : 'rgba(184, 92, 92, 0.3)'
          : 'var(--ink-border-subtle)',
      }}
    >
      <div className="relative z-10 flex items-start gap-4">
        {/* Provider badge */}
        <div
          className="obs-provider-badge brass transition-transform group-hover:scale-110"
        >
          {provider.name.charAt(0)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span
              className="font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {provider.name}
            </span>
            <span
              className="text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {provider.models.length} models
            </span>

            {/* Status indicator */}
            {isConfigured && (
              <div
                className={`obs-status-dot ml-auto ${
                  configuredKey.isValid ? 'success' : 'error'
                }`}
              />
            )}
          </div>

          {/* Key info or models preview */}
          {isConfigured ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <code
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background: 'var(--ink-deepest)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {configuredKey.keyPreview}
                </code>
                {configuredKey.validationError && (
                  <span
                    className="text-xs truncate"
                    style={{ color: 'var(--error)' }}
                  >
                    {configuredKey.validationError}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button onClick={onEdit} className="obs-button-ghost text-xs">
                  Update
                </button>
                <button
                  onClick={handleValidate}
                  disabled={isValidating || isOnCooldown}
                  className="obs-button-ghost text-xs disabled:opacity-50 flex items-center gap-1.5"
                  style={{
                    color: validationResult === 'success'
                      ? 'var(--success)'
                      : validationResult === 'error'
                      ? 'var(--error)'
                      : undefined,
                  }}
                >
                  {isValidating ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Validating
                    </>
                  ) : isOnCooldown ? (
                    `Wait ${cooldownSeconds}s`
                  ) : validationResult === 'success' ? (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Valid
                    </>
                  ) : validationResult === 'error' ? (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Failed
                    </>
                  ) : (
                    'Validate'
                  )}
                </button>
                <button onClick={onRemove} className="obs-button-danger text-xs">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between">
              <span
                className="text-sm truncate"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {provider.models.slice(0, 2).map((m) => m.name).join(', ')}
                {provider.models.length > 2 && ` +${provider.models.length - 2}`}
              </span>
              <button
                onClick={onAdd}
                className="obs-button-primary px-3 py-1.5 text-xs"
              >
                Add Key
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
