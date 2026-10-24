export type ProviderCategory = 
  | 'frontier' 
  | 'ultrafast' 
  | 'opensource' 
  | 'aggregator' 
  | 'embeddings' 
  | 'specialized';

export interface AIProvider {
  id: string;
  name: string;
  category: ProviderCategory;
  description: string;
  websiteUrl: string;
  docsUrl: string;
  keyUrl: string; // Direct link to get API key
  baseUrl: string;
  authHeader: string; // e.g. "Bearer {key}" or "x-api-key"
  authType: 'bearer' | 'header' | 'query';
  authHeaderName?: string;
  models: {
    id: string;
    name: string;
    context: number;
    description: string;
    inputCostPer1M?: string;
    outputCostPer1M?: string;
  }[];
  defaultModel: string;
  statusEndpoint?: string;
  isOpenAiCompatible: boolean;
  notes?: string;
}

export interface CustomEngine {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  modelId: string;
  protocol: 'openai' | 'ollama' | 'anthropic' | 'raw';
  customHeaders?: Record<string, string>;
  timeoutMs: number;
  isActive: boolean;
  notes?: string;
  lastPingStatus?: 'healthy' | 'unreachable' | 'unknown';
  lastPingLatencyMs?: number;
}

export interface GgufModel {
  id: string;
  name: string;
  architecture: string;
  quantization: string;
  fileSizeMb: number;
  parameterCount: string;
  contextWindow: number;
  huggingFaceUrl: string;
  downloadUrl: string;
  recommendedLlamaCppCommand: string;
  description: string;
  tags: string[];
  systemPrompt: string;
  benchmarkTps: number; // approximate tokens per sec
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  condition: 'model-match' | 'fallback' | 'cost-optimized' | 'speed-optimized' | 'custom-engine';
  targetType: 'provider' | 'custom-engine' | 'gguf';
  targetId: string; // Provider ID, CustomEngine ID, or Gguf ID
  targetModel: string;
  fallbackTargetId?: string;
  fallbackTargetModel?: string;
  active: boolean;
}

export interface RouterConfig {
  routingStrategy: 'direct' | 'fallback' | 'speed' | 'cost' | 'custom-first';
  defaultProviderId: string;
  defaultModelId: string;
  fallbackProviderId: string;
  fallbackModelId: string;
  rateLimitRetry: boolean;
  maxRetries: number;
  timeoutMs: number;
  logRequests: boolean;
}

export interface ApiRequestLog {
  id: string;
  timestamp: number;
  endpoint: string;
  method: string;
  clientIp?: string;
  requestedModel: string;
  routedTo: {
    type: 'provider' | 'custom-engine' | 'gguf';
    id: string;
    name: string;
    model: string;
  };
  statusCode: number;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  promptPreview: string;
  responsePreview: string;
  error?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface GgufHeaderMetadata {
  magic: string;
  version: number;
  tensorCount: number;
  metadataKvCount: number;
  architecture?: string;
  modelName?: string;
  quantization?: string;
  contextLength?: number;
  embeddingLength?: number;
  blockCount?: number;
  rawMetadata: Record<string, any>;
}
