import React, { useState, useRef, useEffect } from 'react';
import { AIProvider, GgufModel, CustomEngine, ApiRequestLog } from '../types/router';
import { 
  Send, Sparkles, RefreshCw, StopCircle, Terminal, 
  Clock, Zap, Check, Copy, Code, Layers 
} from 'lucide-react';

interface PlaygroundProps {
  providers: AIProvider[];
  ggufModels: GgufModel[];
  customEngines: CustomEngine[];
  apiKeys: Record<string, string>;
  activeTarget: {
    type: 'provider' | 'gguf' | 'custom-engine';
    id: string;
    model: string;
    name: string;
  };
  onLogRequest: (log: ApiRequestLog) => void;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens?: number;
  latencyMs?: number;
  routedModel?: string;
}

export const Playground: React.FC<PlaygroundProps> = ({
  providers,
  ggufModels,
  customEngines,
  apiKeys,
  activeTarget,
  onLogRequest,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'NexusAI Router connected and active. You can prompt any model across 34 providers, local GGUF models (Llama 3.2 1B, SmolLM2 360M, Qwen 2.5 0.5B), or your custom engines through the universal endpoint.',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [stream, setStream] = useState(true);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string>(
    `${activeTarget.type}:${activeTarget.id}:${activeTarget.model}`
  );
  const [lastRawResponse, setLastRawResponse] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'raw'>('chat');
  const [copiedResponse, setCopiedResponse] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync when activeTarget changes from parent
  useEffect(() => {
    setSelectedTargetKey(`${activeTarget.type}:${activeTarget.id}:${activeTarget.model}`);
  }, [activeTarget]);

  const handleSend = async (presetText?: string) => {
    const textToSend = presetText || inputPrompt;
    if (!textToSend.trim() || isGenerating) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    if (!presetText) setInputPrompt('');
    setIsGenerating(true);

    const [targetType, targetId, targetModel] = selectedTargetKey.split(':');
    const startTime = Date.now();

    // Determine custom headers or keys if applicable
    const customEngine = customEngines.find(e => e.id === targetId);
    const provider = providers.find(p => p.id === targetId);
    const key = provider ? (apiKeys[provider.id] || '') : (customEngine?.apiKey || '');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    if (customEngine) {
      headers['x-target-engine'] = customEngine.id;
      headers['x-custom-base-url'] = customEngine.baseUrl;
    }

    abortControllerRef.current = new AbortController();

    try {
      const payload = {
        model: targetModel,
        messages: [
          ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: textToSend },
        ],
        temperature,
        stream,
        max_tokens: 1024,
      };

      const response = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (stream && response.body) {
        // Prepare assistant message
        setMessages(prev => [...prev, { role: 'assistant', content: '', routedModel: targetModel }]);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  fullContent += delta;
                  setMessages(prev => {
                    const next = [...prev];
                    const lastIndex = next.length - 1;
                    if (next[lastIndex]?.role === 'assistant') {
                      next[lastIndex] = {
                        ...next[lastIndex],
                        content: fullContent,
                        latencyMs: Date.now() - startTime,
                      };
                    }
                    return next;
                  });
                }
              } catch {
                // Ignore partial chunks in stream
              }
            }
          }
        }

        const totalLatency = Date.now() - startTime;
        setLastRawResponse({
          model: targetModel,
          stream: true,
          content: fullContent,
          latencyMs: totalLatency,
        });

        onLogRequest({
          id: `req-${Date.now()}`,
          timestamp: Date.now(),
          endpoint: '/api/v1/chat/completions',
          method: 'POST',
          requestedModel: targetModel,
          routedTo: {
            type: targetType as any,
            id: targetId,
            name: provider?.name || customEngine?.name || targetModel,
            model: targetModel,
          },
          statusCode: 200,
          latencyMs: totalLatency,
          promptTokens: Math.ceil(textToSend.length / 4),
          completionTokens: Math.ceil(fullContent.length / 4),
          promptPreview: textToSend.slice(0, 100),
          responsePreview: fullContent.slice(0, 120),
        });

      } else {
        // Non-streaming response
        const data = await response.json();
        const latency = Date.now() - startTime;
        const reply = data.choices?.[0]?.message?.content || 'No response returned.';

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: reply,
            latencyMs: latency,
            routedModel: data.model || targetModel,
          },
        ]);

        setLastRawResponse(data);

        onLogRequest({
          id: `req-${Date.now()}`,
          timestamp: Date.now(),
          endpoint: '/api/v1/chat/completions',
          method: 'POST',
          requestedModel: targetModel,
          routedTo: {
            type: targetType as any,
            id: targetId,
            name: provider?.name || customEngine?.name || targetModel,
            model: targetModel,
          },
          statusCode: response.status,
          latencyMs: latency,
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          promptPreview: textToSend.slice(0, 100),
          responsePreview: reply.slice(0, 120),
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const latency = Date.now() - startTime;
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error routing request: ${err.message}. If using a cloud provider, verify your API key in the Catalog tab. If using local GGUF/llama.cpp, verify server is running on port 8080.`,
          latencyMs: latency,
        },
      ]);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleCopyLastResponse = () => {
    const last = messages.slice().reverse().find(m => m.role === 'assistant');
    if (last) {
      navigator.clipboard.writeText(last.content);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  const quickPrompts = [
    'Explain how GGUF quantizes neural network weights.',
    'Write a python script to query this One-URL endpoint.',
    'Benchmark comparison: Cerebras vs Groq vs Local LPU.',
    'Status ping: verify all downstream model routing.',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Configuration Sidebar */}
      <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-5 h-fit">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Router Workbench</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Test routing and model inference right in your browser.
          </p>
        </div>

        {/* Target Engine Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Routing Target
          </label>
          <select
            value={selectedTargetKey}
            onChange={e => setSelectedTargetKey(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          >
            <optgroup label="Local GGUF Models (3 Files)">
              {ggufModels.map(m => (
                <option key={m.id} value={`gguf:${m.id}:${m.id}`}>
                  {m.name} ({m.quantization})
                </option>
              ))}
            </optgroup>

            {customEngines.length > 0 && (
              <optgroup label="Custom Inserted Engines">
                {customEngines.map(e => (
                  <option key={e.id} value={`custom-engine:${e.id}:${e.modelId}`}>
                    {e.name} ({e.modelId})
                  </option>
                ))}
              </optgroup>
            )}

            <optgroup label="Cloud AI Providers (34 Catalog)">
              {providers.slice(0, 15).map(p => (
                <option key={p.id} value={`provider:${p.id}:${p.defaultModel}`}>
                  {p.name} — {p.defaultModel}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Temperature slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Temperature</span>
            <span className="text-slate-400 font-mono tabular-nums">{temperature}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={temperature}
            onChange={e => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Streaming toggle */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-300 font-medium">Stream Tokens (SSE)</span>
          <button
            type="button"
            onClick={() => setStream(!stream)}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
              stream ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                stream ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Quick Prompts */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-medium text-slate-400">Quick Test Prompts:</span>
          <div className="space-y-1.5">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp)}
                disabled={isGenerating}
                className="w-full text-left p-2 rounded bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 text-[11px] text-slate-300 transition-colors line-clamp-2 disabled:opacity-50"
              >
                &ldquo;{qp}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[650px] overflow-hidden">
        {/* Chat Header */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeTab === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Interactive Chat
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                  activeTab === 'raw' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Raw JSON</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLastResponse}
              className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-800"
              title="Copy assistant reply"
            >
              {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedResponse ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => setMessages([])}
              className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        {activeTab === 'chat' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-500 font-mono">
                  <span>{msg.role === 'user' ? 'Client Request' : 'Router Response'}</span>
                  {msg.latencyMs !== undefined && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {msg.latencyMs}ms
                      </span>
                    </>
                  )}
                  {msg.routedModel && (
                    <>
                      <span>·</span>
                      <span className="text-slate-400">{msg.routedModel}</span>
                    </>
                  )}
                </div>

                <div
                  className={`max-w-2xl rounded-xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-500/30'
                      : 'bg-slate-950 text-slate-200 border border-slate-800 font-sans'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-xs text-emerald-400">
            {lastRawResponse ? (
              <pre>{JSON.stringify(lastRawResponse, null, 2)}</pre>
            ) : (
              <div className="text-slate-500 text-center py-20">
                Execute a prompt in the chat tab to view the live JSON payload returned by the router.
              </div>
            )}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything through the single router URL..."
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              disabled={isGenerating}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />

            {isGenerating ? (
              <button
                type="button"
                onClick={handleStop}
                className="px-4 py-2.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-500/30 transition-colors flex items-center gap-1.5"
              >
                <StopCircle className="w-4 h-4 text-rose-400" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputPrompt.trim()}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
