import type { Provider, Model, ConfiguredKey } from '../../../lib/types';

interface ModelSelectorProps {
  providers: Provider[];
  availableModels: Model[];
  selectedModels: string[];
  configuredKeys: ConfiguredKey[];
  onChange: (selected: string[]) => void;
}

export function ModelSelector({
  providers,
  availableModels,
  selectedModels,
  configuredKeys,
  onChange,
}: ModelSelectorProps) {
  const availableIds = new Set(availableModels.map((m) => m.id));

  const getProviderStatus = (providerId: string) => {
    const key = configuredKeys.find(k => k.providerId === providerId);
    if (!key) return 'no-key';
    return key.isValid ? 'valid' : 'invalid';
  };

  const toggleModel = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      onChange(selectedModels.filter((id) => id !== modelId));
    } else {
      onChange([...selectedModels, modelId]);
    }
  };

  const selectAll = () => onChange(availableModels.map((m) => m.id));
  const deselectAll = () => onChange([]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="obs-etched">Models to Observe</label>
        <div className="flex items-center gap-4 text-sm">
          <span style={{ color: 'var(--text-tertiary)' }}>
            {selectedModels.length}/{availableModels.length}
          </span>
          <button onClick={selectAll} className="obs-button-ghost">All</button>
          <button onClick={deselectAll} className="obs-button-ghost">None</button>
        </div>
      </div>

      <div className="space-y-6">
        {providers.map((provider) => {
          const status = getProviderStatus(provider.id);

          return (
            <div key={provider.id} className="space-y-3">
              {/* Provider header */}
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      status === 'valid' ? 'var(--success)' :
                      status === 'invalid' ? 'var(--error)' :
                      'var(--text-tertiary)',
                  }}
                />
                <span className="obs-etched">{provider.name}</span>
              </div>

              {/* Model grid */}
              <div className="grid grid-cols-2 gap-2">
                {provider.models.map((model) => {
                  const isAvailable = availableIds.has(model.id);
                  const isSelected = selectedModels.includes(model.id);

                  return (
                    <button
                      key={model.id}
                      onClick={() => isAvailable && toggleModel(model.id)}
                      disabled={!isAvailable}
                      className="flex items-center gap-3 px-3 py-2.5 rounded transition-all text-left"
                      style={{
                        background: isSelected
                          ? 'rgba(201, 165, 92, 0.1)'
                          : 'var(--ink-deepest)',
                        border: `1px solid ${isSelected ? 'var(--brass-dim)' : 'var(--ink-border)'}`,
                        opacity: isAvailable ? 1 : 0.4,
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        className={`obs-checkbox ${isSelected ? 'checked' : ''}`}
                      >
                        {isSelected && (
                          <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Model name */}
                      <span
                        className="text-sm truncate"
                        style={{
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {model.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
