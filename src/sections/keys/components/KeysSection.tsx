import { useState, useEffect } from 'react';
import { ProviderCard } from './ProviderCard';
import { AddKeyModal } from './AddKeyModal';
import { EmptyState } from './EmptyState';
import type { Provider, ConfiguredKey, KeyValidationResult } from '../../../lib/types';

interface KeysSectionProps {
  providers: Provider[];
  configuredKeys: ConfiguredKey[];
  onAddKey: (providerId: string, key: string) => Promise<boolean>;
  onRemoveKey: (providerId: string) => void;
  onValidateKey: (providerId: string) => Promise<boolean>;
  onValidateAll: () => Promise<void>;
  onValidateNewKey: (providerId: string, key: string) => Promise<KeyValidationResult>;
}

const VALIDATE_ALL_COOLDOWN = 60000; // 60 seconds

export function KeysSection({
  providers,
  configuredKeys,
  onAddKey,
  onRemoveKey,
  onValidateKey,
  onValidateAll,
  onValidateNewKey,
}: KeysSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationTimestamps, setValidationTimestamps] = useState<Record<string, number>>({});
  const [lastValidateAll, setLastValidateAll] = useState<number>(0);
  const [validateAllCooldown, setValidateAllCooldown] = useState(0);
  const [validateAllResult, setValidateAllResult] = useState<'success' | 'error' | null>(null);

  const configuredProviderIds = configuredKeys.map((k) => k.providerId);
  const unconfiguredProviders = providers.filter(
    (p) => !configuredProviderIds.includes(p.id)
  );

  // Update validate all cooldown
  useEffect(() => {
    if (!lastValidateAll) {
      setValidateAllCooldown(0);
      return;
    }

    const updateCooldown = () => {
      const elapsed = Date.now() - lastValidateAll;
      const remaining = Math.max(0, VALIDATE_ALL_COOLDOWN - elapsed);
      setValidateAllCooldown(remaining);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastValidateAll]);

  // Clear validate all result after 3 seconds
  useEffect(() => {
    if (validateAllResult) {
      const timeout = setTimeout(() => setValidateAllResult(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [validateAllResult]);

  const handleAddClick = (providerId?: string) => {
    setSelectedProvider(providerId || null);
    setIsAddModalOpen(true);
  };

  const handleValidateKey = async (providerId: string): Promise<boolean> => {
    const result = await onValidateKey(providerId);
    setValidationTimestamps(prev => ({
      ...prev,
      [providerId]: Date.now(),
    }));
    return result;
  };

  const handleValidateAll = async () => {
    if (isValidating || validateAllCooldown > 0 || configuredKeys.length === 0) return;

    setIsValidating(true);
    setValidateAllResult(null);

    try {
      await onValidateAll();
      // Update all timestamps
      const now = Date.now();
      const newTimestamps: Record<string, number> = {};
      configuredKeys.forEach(key => {
        newTimestamps[key.providerId] = now;
      });
      setValidationTimestamps(prev => ({ ...prev, ...newTimestamps }));
      setLastValidateAll(now);
      setValidateAllResult('success');
    } catch {
      setValidateAllResult('error');
    } finally {
      setIsValidating(false);
    }
  };

  const isValidateAllOnCooldown = validateAllCooldown > 0;
  const validateAllCooldownSeconds = Math.ceil(validateAllCooldown / 1000);
  const hasConfiguredKeys = configuredKeys.length > 0;

  if (configuredKeys.length === 0) {
    return (
      <>
        <EmptyState providers={providers} onAddKey={handleAddClick} />
        <AddKeyModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          providers={providers}
          selectedProviderId={selectedProvider}
          onSubmit={onAddKey}
          onValidate={onValidateNewKey}
        />
      </>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
            API Keys
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Stored locally in your browser
          </p>
        </div>
        <button
          onClick={handleValidateAll}
          disabled={isValidating || isValidateAllOnCooldown || !hasConfiguredKeys}
          className="obs-button-secondary px-4 py-2 disabled:opacity-50 flex items-center gap-2"
          style={{
            borderColor: validateAllResult === 'success'
              ? 'var(--success)'
              : validateAllResult === 'error'
              ? 'var(--error)'
              : undefined,
            color: validateAllResult === 'success'
              ? 'var(--success)'
              : validateAllResult === 'error'
              ? 'var(--error)'
              : undefined,
          }}
        >
          {isValidating ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Validating...
            </>
          ) : isValidateAllOnCooldown ? (
            `Wait ${validateAllCooldownSeconds}s`
          ) : validateAllResult === 'success' ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              All Valid
            </>
          ) : validateAllResult === 'error' ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Some Failed
            </>
          ) : (
            'Validate All'
          )}
        </button>
      </div>

      <div className="obs-rule" />

      {/* Configured Providers */}
      <div className="space-y-4">
        <p className="obs-etched">Configured</p>
        <div className="space-y-3 stagger-children">
          {configuredKeys.map((key) => {
            const provider = providers.find((p) => p.id === key.providerId);
            if (!provider) return null;
            return (
              <ProviderCard
                key={key.providerId}
                provider={provider}
                configuredKey={key}
                onEdit={() => handleAddClick(key.providerId)}
                onRemove={() => onRemoveKey(key.providerId)}
                onValidate={() => handleValidateKey(key.providerId)}
                lastValidatedAt={validationTimestamps[key.providerId]}
              />
            );
          })}
        </div>
      </div>

      {/* Unconfigured Providers */}
      {unconfiguredProviders.length > 0 && (
        <div className="space-y-4">
          <p className="obs-etched">Available</p>
          <div className="grid gap-3 sm:grid-cols-2 stagger-children">
            {unconfiguredProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onAdd={() => handleAddClick(provider.id)}
              />
            ))}
          </div>
        </div>
      )}

      <AddKeyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        providers={providers}
        selectedProviderId={selectedProvider}
        onSubmit={onAddKey}
        onValidate={onValidateNewKey}
      />
    </div>
  );
}
