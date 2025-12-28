/**
 * One Word - Provider Abstraction Layer
 *
 * Unified interface for API providers (Anthropic, OpenAI, Kimi)
 * Includes rate limiting, cost estimation, and error handling
 */

import type {
  Provider,
  ProviderInterface,
  SampleParams,
  CostParams,
  KeyValidationResult
} from './types';

// ==================== Base Provider Class ====================

abstract class BaseProvider implements ProviderInterface {
  abstract id: string;
  abstract name: string;
  abstract validateKey(key: string): Promise<boolean>;
  abstract sample(params: SampleParams, key: string): Promise<string>;
  abstract estimateCost(params: CostParams): number;

  protected async makeRequest(
    url: string,
    options: RequestInit,
    timeout: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  protected extractWord(text: string): string {
    // Extract single word from API response
    // Handle common variations and clean up
    const cleaned = text
      .trim()
      .replace(/[^\w\s'-]/g, '') // Remove punctuation except hyphens and apostrophes
      .split(/\s+/)[0] // Take first word
      .toLowerCase();

    // Fallback if no valid word
    if (!cleaned || cleaned.length === 0) {
      throw new Error('No valid word in response');
    }

    return cleaned;
  }
}

// ==================== Anthropic Provider ====================

class AnthropicProvider extends BaseProvider {
  id = 'anthropic';
  name = 'Anthropic';
  baseUrl = '/api/anthropic'; // Proxied through nginx to avoid CORS

  async validateKey(key: string): Promise<boolean> {
    // CORS prevents direct API validation from browser
    // Validate key format instead - actual validation happens on first use
    if (!key || typeof key !== 'string') return false;

    // Anthropic keys start with 'sk-ant-' and are typically 100+ chars
    const isValidFormat = key.startsWith('sk-ant-') && key.length > 50;
    return isValidFormat;
  }

  async sample(params: SampleParams, key: string): Promise<string> {
    const systemPrompt = 'Continue this sentence with exactly one word. Respond with only that single word, nothing else.';

    const response = await this.makeRequest(
      `${this.baseUrl}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': key,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: params.model,
          max_tokens: params.maxTokens || 5,
          system: systemPrompt,
          messages: [{ role: 'user', content: params.stimulus }],
          // Anthropic only supports temperature 0..1
          temperature: Math.min(1, Math.max(0, params.temperature)),
          top_k: params.topK,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error('No content in Anthropic response');
    }

    return this.extractWord(content);
  }

  estimateCost(params: CostParams): number {
    // Anthropic pricing (per 1k tokens)
    const modelPricing: Record<string, { input: number; output: number }> = {
      // Claude 4.5
      'claude-opus-4-5-20251101': { input: 0.005, output: 0.025 },
      'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015 },
      'claude-haiku-4-5-20251001': { input: 0.001, output: 0.005 },
      // Claude 4.1
      'claude-opus-4-1-20250805': { input: 0.015, output: 0.075 },
      // Claude 4
      'claude-opus-4-20250514': { input: 0.015, output: 0.075 },
      'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
      // Claude 3.7
      'claude-3-7-sonnet-20250219': { input: 0.003, output: 0.015 },
      // Claude 3.5
      'claude-3-5-haiku-20241022': { input: 0.001, output: 0.005 },
      // Claude 3
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    };

    const pricing = modelPricing[params.model];
    if (!pricing) {
      return 0; // Unknown model
    }

    const inputCost = (params.inputTokens / 1000) * pricing.input;
    const outputCost = (params.outputTokens / 1000) * pricing.output;

    return inputCost + outputCost;
  }
}

// ==================== OpenAI Provider ====================

class OpenAIProvider extends BaseProvider {
  id = 'openai';
  name = 'OpenAI';
  baseUrl = '/api/openai'; // Proxied through nginx to avoid CORS

  async validateKey(key: string): Promise<boolean> {
    // CORS prevents direct API validation from browser
    if (!key || typeof key !== 'string') return false;

    // OpenAI keys start with 'sk-' but NOT 'sk-ant-' (Anthropic) or 'sk-kimi-' (Kimi)
    const isValidFormat = key.startsWith('sk-') &&
      !key.startsWith('sk-ant-') &&
      !key.startsWith('sk-kimi-') &&
      key.length > 40;
    return isValidFormat;
  }

  async sample(params: SampleParams, key: string): Promise<string> {
    const systemPrompt = 'Continue this sentence with exactly one word. Respond with only that single word, nothing else.';

    const response = await this.makeRequest(
      `${this.baseUrl}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: params.model,
          max_tokens: params.maxTokens || 5,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: params.stimulus },
          ],
          temperature: params.temperature,
          // OpenAI doesn't have top_k, using top_p instead
          top_p: Math.max(0.1, params.topK / 100),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return this.extractWord(content);
  }

  estimateCost(params: CostParams): number {
    // OpenAI pricing (per 1k tokens)
    const modelPricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      // Add other models as needed
    };

    const pricing = modelPricing[params.model];
    if (!pricing) {
      return 0; // Unknown model
    }

    const inputCost = (params.inputTokens / 1000) * pricing.input;
    const outputCost = (params.outputTokens / 1000) * pricing.output;

    return inputCost + outputCost;
  }
}

// ==================== Kimi Provider ====================

class KimiProvider extends BaseProvider {
  id = 'kimi';
  name = 'Kimi';
  baseUrl = '/api/kimi'; // Proxied through nginx to avoid CORS

  async validateKey(key: string): Promise<boolean> {
    // CORS prevents direct API validation from browser
    if (!key || typeof key !== 'string') return false;

    // Kimi/Moonshot keys start with 'sk-' or 'sk-kimi-'
    const isValidFormat = key.length > 30 && (key.startsWith('sk-kimi-') || key.startsWith('sk-'));
    return isValidFormat;
  }

  async sample(params: SampleParams, key: string): Promise<string> {
    const systemPrompt = 'Continue this sentence with exactly one word. Respond with only that single word, nothing else.';

    const response = await this.makeRequest(
      `${this.baseUrl}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: params.model,
          max_tokens: params.maxTokens || 5,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: params.stimulus },
          ],
          temperature: params.temperature,
          // Kimi might have different parameter names
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kimi API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in Kimi response');
    }

    return this.extractWord(content);
  }

  estimateCost(params: CostParams): number {
    // Kimi pricing (per 1k tokens)
    const modelPricing: Record<string, { input: number; output: number }> = {
      'moonshot-v1-8k': { input: 0.001, output: 0.002 },
      'moonshot-v1-32k': { input: 0.002, output: 0.004 },
      'moonshot-v1-128k': { input: 0.005, output: 0.01 },
    };

    const pricing = modelPricing[params.model];
    if (!pricing) {
      return 0; // Unknown model
    }

    const inputCost = (params.inputTokens / 1000) * pricing.input;
    const outputCost = (params.outputTokens / 1000) * pricing.output;

    return inputCost + outputCost;
  }
}

// ==================== Rate Limiter ====================

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

class RateLimiter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueueItem<any>[] = [];
  private processing = false;
  private interval: number;
  private lastRequestTime = 0;

  constructor(requestsPerMinute: number) {
    this.interval = 60000 / requestsPerMinute; // ms between requests
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject } as QueueItem<T>);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      // Ensure minimum interval between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.interval) {
        await new Promise(resolve => setTimeout(resolve, this.interval - timeSinceLastRequest));
      }

      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }

      this.lastRequestTime = Date.now();
    }

    this.processing = false;
  }
}

// ==================== Provider Registry ====================

class ProviderRegistry {
  private providers = new Map<string, BaseProvider>();
  private rateLimiters = new Map<string, RateLimiter>();

  constructor() {
    // Register built-in providers
    this.register(new AnthropicProvider());
    this.register(new OpenAIProvider());
    this.register(new KimiProvider());
  }

  register(provider: BaseProvider): void {
    this.providers.set(provider.id, provider);
    // Default rate limit: 60 requests per minute
    this.rateLimiters.set(provider.id, new RateLimiter(60));
  }

  getProvider(providerId: string): BaseProvider | undefined {
    return this.providers.get(providerId);
  }

  getAllProviders(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  async validateKey(providerId: string, key: string): Promise<KeyValidationResult> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return { isValid: false, error: 'Unknown provider' };
    }

    try {
      const isValid = await provider.validateKey(key);
      return { isValid };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  async sample(providerId: string, params: SampleParams, key: string): Promise<string> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const rateLimiter = this.rateLimiters.get(providerId)!;
    return rateLimiter.enqueue(() => provider.sample(params, key));
  }

  estimateCost(providerId: string, params: CostParams): number {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return 0;
    }

    return provider.estimateCost(params);
  }

  setRateLimit(providerId: string, requestsPerMinute: number): void {
    this.rateLimiters.set(providerId, new RateLimiter(requestsPerMinute));
  }
}

// ==================== Static Provider Data ====================

export const PROVIDER_DATA: Provider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    accentColor: 'cyan',
    baseUrl: 'https://api.anthropic.com',
    models: [
      // Claude 4.5 generation (current)
      {
        id: 'claude-opus-4-5-20251101',
        providerId: 'anthropic',
        name: 'Claude 4.5 Opus',
        generation: '4.5',
        inputCostPer1k: 0.005,
        outputCostPer1k: 0.025,
      },
      {
        id: 'claude-sonnet-4-5-20250929',
        providerId: 'anthropic',
        name: 'Claude 4.5 Sonnet',
        generation: '4.5',
        inputCostPer1k: 0.003,
        outputCostPer1k: 0.015,
      },
      {
        id: 'claude-haiku-4-5-20251001',
        providerId: 'anthropic',
        name: 'Claude 4.5 Haiku',
        generation: '4.5',
        inputCostPer1k: 0.001,
        outputCostPer1k: 0.005,
      },
      // Claude 4.1 generation
      {
        id: 'claude-opus-4-1-20250805',
        providerId: 'anthropic',
        name: 'Claude 4.1 Opus',
        generation: '4.1',
        inputCostPer1k: 0.015,
        outputCostPer1k: 0.075,
      },
      // Claude 4 generation
      {
        id: 'claude-opus-4-20250514',
        providerId: 'anthropic',
        name: 'Claude 4 Opus',
        generation: '4',
        inputCostPer1k: 0.015,
        outputCostPer1k: 0.075,
      },
      {
        id: 'claude-sonnet-4-20250514',
        providerId: 'anthropic',
        name: 'Claude 4 Sonnet',
        generation: '4',
        inputCostPer1k: 0.003,
        outputCostPer1k: 0.015,
      },
      // Claude 3.7 generation
      {
        id: 'claude-3-7-sonnet-20250219',
        providerId: 'anthropic',
        name: 'Claude 3.7 Sonnet',
        generation: '3.7',
        inputCostPer1k: 0.003,
        outputCostPer1k: 0.015,
      },
      // Claude 3.5 generation
      {
        id: 'claude-3-5-haiku-20241022',
        providerId: 'anthropic',
        name: 'Claude 3.5 Haiku',
        generation: '3.5',
        inputCostPer1k: 0.001,
        outputCostPer1k: 0.005,
      },
      // Claude 3 generation (legacy)
      {
        id: 'claude-3-opus-20240229',
        providerId: 'anthropic',
        name: 'Claude 3 Opus',
        generation: '3',
        inputCostPer1k: 0.015,
        outputCostPer1k: 0.075,
      },
      {
        id: 'claude-3-haiku-20240307',
        providerId: 'anthropic',
        name: 'Claude 3 Haiku',
        generation: '3',
        inputCostPer1k: 0.00025,
        outputCostPer1k: 0.00125,
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    accentColor: 'emerald',
    baseUrl: 'https://api.openai.com',
    models: [
      // O-series reasoning models
      {
        id: 'o1',
        providerId: 'openai',
        name: 'o1',
        generation: 'o1',
        inputCostPer1k: 0.015,
        outputCostPer1k: 0.06,
      },
      {
        id: 'o1-mini',
        providerId: 'openai',
        name: 'o1 Mini',
        generation: 'o1',
        inputCostPer1k: 0.003,
        outputCostPer1k: 0.012,
      },
      {
        id: 'o3-mini',
        providerId: 'openai',
        name: 'o3 Mini',
        generation: 'o3',
        inputCostPer1k: 0.0011,
        outputCostPer1k: 0.0044,
      },
      // GPT-4 series
      {
        id: 'gpt-4o',
        providerId: 'openai',
        name: 'GPT-4o',
        generation: '4o',
        inputCostPer1k: 0.0025,
        outputCostPer1k: 0.01,
      },
      {
        id: 'gpt-4o-mini',
        providerId: 'openai',
        name: 'GPT-4o Mini',
        generation: '4o',
        inputCostPer1k: 0.00015,
        outputCostPer1k: 0.0006,
      },
      {
        id: 'gpt-4-turbo',
        providerId: 'openai',
        name: 'GPT-4 Turbo',
        generation: '4',
        inputCostPer1k: 0.01,
        outputCostPer1k: 0.03,
      },
    ],
  },
  {
    id: 'kimi',
    name: 'Kimi',
    icon: '🌙',
    accentColor: 'amber',
    baseUrl: 'https://api.moonshot.cn',
    models: [
      {
        id: 'moonshot-v1-8k',
        providerId: 'kimi',
        name: 'Moonshot v1 8K',
        generation: '1',
        inputCostPer1k: 0.001,
        outputCostPer1k: 0.002,
      },
      {
        id: 'moonshot-v1-32k',
        providerId: 'kimi',
        name: 'Moonshot v1 32K',
        generation: '1',
        inputCostPer1k: 0.002,
        outputCostPer1k: 0.004,
      },
      {
        id: 'moonshot-v1-128k',
        providerId: 'kimi',
        name: 'Moonshot v1 128K',
        generation: '1',
        inputCostPer1k: 0.006,
        outputCostPer1k: 0.012,
      },
    ],
  },
];

// ==================== Singleton Instance ====================

export const providers = new ProviderRegistry();

// ==================== Exports ====================

export {
  BaseProvider,
  AnthropicProvider,
  OpenAIProvider,
  KimiProvider,
  RateLimiter,
  ProviderRegistry,
};