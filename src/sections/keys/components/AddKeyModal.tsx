import { useState, useEffect } from 'react';
import type { Provider, KeyValidationResult } from '../../../lib/types';

interface AddKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Provider[];
  selectedProviderId: string | null;
  onSubmit: (providerId: string, key: string) => Promise<boolean>;
  onValidate: (providerId: string, key: string) => Promise<KeyValidationResult>;
}

export function AddKeyModal({
  isOpen,
  onClose,
  providers,
  selectedProviderId,
  onSubmit,
  onValidate,
}: AddKeyModalProps) {
  const [providerId, setProviderId] = useState(selectedProviderId || '');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProviderId) {
      setProviderId(selectedProviderId);
    }
  }, [selectedProviderId]);

  useEffect(() => {
    if (!isOpen) {
      setKey('');
      setShowKey(false);
      setIsValidating(false);
      setIsValid(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleValidate = async () => {
    if (!providerId || !key.trim()) return;

    setIsValidating(true);
    setError(null);

    try {
      const result = await onValidate(providerId, key.trim());
      setIsValid(result.isValid);
      if (!result.isValid) {
        setError(result.error || 'Invalid API key');
      }
    } catch (err) {
      setIsValid(false);
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!providerId || !key.trim() || !isValid) return;

    const success = await onSubmit(providerId, key.trim());
    if (success) {
      onClose();
    } else {
      setError('Failed to save key');
    }
  };

  const selectedProvider = providers.find((p) => p.id === providerId);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 obs-backdrop z-50 animate-fade-in-up"
        style={{ animationDuration: '0.2s' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="obs-modal w-full max-w-md p-6 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2
              className="font-display text-xl"
              style={{ color: 'var(--text-primary)' }}
            >
              {selectedProviderId ? 'Update API Key' : 'Add API Key'}
            </h2>
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

          <div className="space-y-5">
            {/* Provider selector */}
            {!selectedProviderId && (
              <div className="space-y-2">
                <label className="obs-etched">Provider</label>
                <select
                  value={providerId}
                  onChange={(e) => {
                    setProviderId(e.target.value);
                    setIsValid(null);
                    setError(null);
                  }}
                  className="obs-select w-full px-4 py-3"
                >
                  <option value="">Select a provider</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selected provider info */}
            {selectedProvider && (
              <div
                className="flex items-center gap-3 p-3 rounded"
                style={{ background: 'var(--ink-deepest)' }}
              >
                <div className="obs-provider-badge brass">
                  {selectedProvider.name.charAt(0)}
                </div>
                <div>
                  <span
                    className="font-medium text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {selectedProvider.name}
                  </span>
                  <span
                    className="text-xs ml-2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {selectedProvider.models.length} models available
                  </span>
                </div>
              </div>
            )}

            {/* Key input */}
            <div className="space-y-2">
              <label className="obs-etched">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setIsValid(null);
                    setError(null);
                  }}
                  placeholder="sk-..."
                  className="obs-input w-full px-4 py-3 pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Validation status */}
            {error && (
              <div
                className="flex items-center gap-2 text-sm animate-fade-in-up"
                style={{ color: 'var(--error)' }}
              >
                <div className="obs-status-dot error" />
                {error}
              </div>
            )}
            {isValid === true && (
              <div
                className="flex items-center gap-2 text-sm animate-fade-in-up"
                style={{ color: 'var(--success)' }}
              >
                <div className="obs-status-dot success" />
                Key validated successfully
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onClose}
                className="obs-button-secondary flex-1 py-3"
              >
                Cancel
              </button>
              {isValid ? (
                <button
                  onClick={handleSubmit}
                  className="obs-button-primary flex-1 py-3"
                >
                  Save Key
                </button>
              ) : (
                <button
                  onClick={handleValidate}
                  disabled={!providerId || !key.trim() || isValidating}
                  className="obs-button-secondary flex-1 py-3 disabled:opacity-50"
                  style={{
                    borderColor: providerId && key.trim() ? 'var(--brass-dim)' : undefined,
                    color: providerId && key.trim() ? 'var(--brass)' : undefined,
                  }}
                >
                  {isValidating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Validating
                    </span>
                  ) : (
                    'Validate'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
