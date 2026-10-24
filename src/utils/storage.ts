import { CustomEngine, RouterConfig, RoutingRule, ApiRequestLog } from '../types/router';

const STORAGE_KEYS = {
  API_KEYS: 'nexus_ai_api_keys',
  CUSTOM_ENGINES: 'nexus_ai_custom_engines',
  ROUTING_CONFIG: 'nexus_ai_routing_config',
  ROUTING_RULES: 'nexus_ai_routing_rules',
  REQUEST_LOGS: 'nexus_ai_request_logs',
  ACTIVE_TAB: 'nexus_ai_active_tab',
};

const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  routingStrategy: 'direct',
  defaultProviderId: 'groq',
  defaultModelId: 'llama-3.3-70b-versatile',
  fallbackProviderId: 'gemini',
  fallbackModelId: 'gemini-2.5-flash',
  rateLimitRetry: true,
  maxRetries: 2,
  timeoutMs: 30000,
  logRequests: true,
};

const DEFAULT_CUSTOM_ENGINES: CustomEngine[] = [
  {
    id: 'local-ollama',
    name: 'Local Ollama Instance',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama',
    modelId: 'llama3.2',
    protocol: 'openai',
    timeoutMs: 60000,
    isActive: true,
    notes: 'Default local Ollama server running on port 11434.',
    lastPingStatus: 'unknown',
  },
  {
    id: 'local-llama-cpp',
    name: 'Local llama-server (llama.cpp)',
    baseUrl: 'http://localhost:8080/v1',
    apiKey: '',
    modelId: 'default',
    protocol: 'openai',
    timeoutMs: 60000,
    isActive: true,
    notes: 'Direct llama.cpp HTTP server serving local GGUF models.',
    lastPingStatus: 'unknown',
  },
  {
    id: 'custom-vllm-box',
    name: 'Custom GPU Server / vLLM',
    baseUrl: 'http://localhost:8000/v1',
    apiKey: '',
    modelId: 'Qwen/Qwen2.5-7B-Instruct',
    protocol: 'openai',
    timeoutMs: 30000,
    isActive: false,
    notes: 'Connect any remote RunPod, Lambda Labs, or private server.',
    lastPingStatus: 'unknown',
  },
];

export function loadApiKeys(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveApiKey(providerId: string, key: string): void {
  try {
    const current = loadApiKeys();
    if (key.trim()) {
      current[providerId] = key.trim();
    } else {
      delete current[providerId];
    }
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to save API key to local storage', err);
  }
}

export function saveAllApiKeys(keys: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
  } catch (err) {
    console.error('Failed to save API keys', err);
  }
}

export function loadCustomEngines(): CustomEngine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_ENGINES);
    if (!raw) {
      saveCustomEngines(DEFAULT_CUSTOM_ENGINES);
      return DEFAULT_CUSTOM_ENGINES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CUSTOM_ENGINES;
  }
}

export function saveCustomEngines(engines: CustomEngine[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_ENGINES, JSON.stringify(engines));
  } catch (err) {
    console.error('Failed to save custom engines', err);
  }
}

export function loadRouterConfig(): RouterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROUTING_CONFIG);
    return raw ? { ...DEFAULT_ROUTER_CONFIG, ...JSON.parse(raw) } : DEFAULT_ROUTER_CONFIG;
  } catch {
    return DEFAULT_ROUTER_CONFIG;
  }
}

export function saveRouterConfig(config: RouterConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ROUTING_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save router config', err);
  }
}

export function loadRequestLogs(): ApiRequestLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REQUEST_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendRequestLog(log: ApiRequestLog): void {
  try {
    const current = loadRequestLogs();
    const updated = [log, ...current].slice(0, 50); // keep last 50
    localStorage.setItem(STORAGE_KEYS.REQUEST_LOGS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to append request log', err);
  }
}

export function clearRequestLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.REQUEST_LOGS);
  } catch (err) {
    console.error('Failed to clear request logs', err);
  }
}
