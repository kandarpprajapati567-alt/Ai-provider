import React, { useState } from 'react';
import { Copy, Check, Play, Globe, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface OneUrlBannerProps {
  oneUrl: string;
  activeTargetName: string;
  activeTargetType: string;
  onOpenPlayground: () => void;
  onOpenCodeModal: () => void;
}

export const OneUrlBanner: React.FC<OneUrlBannerProps> = ({
  oneUrl,
  activeTargetName,
  activeTargetType,
  onOpenPlayground,
  onOpenCodeModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs: number;
    model: string;
    text: string;
  } | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(oneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickTest = async () => {
    setTesting(true);
    setTestResult(null);
    const start = Date.now();
    try {
      const response = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'default',
          messages: [{ role: 'user', content: 'Ping router health and verify execution.' }],
          temperature: 0.3,
          max_tokens: 60,
        }),
      });

      const data = await response.json();
      const latency = Date.now() - start;

      if (response.ok && data.choices?.[0]?.message?.content) {
        setTestResult({
          ok: true,
          latencyMs: latency,
          model: data.model || 'nexus-router',
          text: data.choices[0].message.content,
        });
      } else {
        setTestResult({
          ok: false,
          latencyMs: latency,
          model: 'error',
          text: data.error?.message || 'Server returned unexpected format',
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        latencyMs: Date.now() - start,
        model: 'network-err',
        text: err.message || 'Failed to reach router endpoint',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 shadow-xl relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Column: Context & The One-URL */}
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Globe className="w-3.5 h-3.5" />
              Universal AI Gateway
            </span>
            <span>·</span>
            <span>OpenAI Compatible (`/v1/chat/completions`)</span>
            <span>·</span>
            <span className="text-slate-300">
              Active Target: <span className="text-emerald-400 font-medium">{activeTargetName}</span> ({activeTargetType})
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            One URL for Any AI Model, Engine, or Local GGUF
          </h1>

          <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
            Plug this single endpoint into Cursor, LangChain, Python, or your custom environment. 
            NexusAI handles intelligent dispatching across 34 cloud AI providers, local GGUF models, 
            and your custom private server with zero client code refactoring.
          </p>

          {/* The URL Box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 font-mono text-xs sm:text-sm text-emerald-400 overflow-x-auto select-all">
              <span className="text-slate-500 mr-2 select-none">POST</span>
              <span className="truncate">{oneUrl}</span>
            </div>

            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Copied URL</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy URL</span>
                </>
              )}
            </button>

            <button
              onClick={handleQuickTest}
              disabled={testing}
              className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <Zap className="w-4 h-4 text-emerald-400" />
              )}
              <span>{testing ? 'Testing...' : 'Test Endpoint'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Quick Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
          <button
            onClick={onOpenPlayground}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Launch Interactive Playground</span>
          </button>

          <button
            onClick={onOpenCodeModal}
            className="px-4 py-2.5 bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700/50 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <span>View Client Code Snippets</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Quick Test Inline Result Banner */}
      {testResult && (
        <div className={`mt-4 p-3.5 rounded-lg border text-xs ${
          testResult.ok 
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' 
            : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
        }`}>
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="font-semibold flex items-center gap-1.5">
              {testResult.ok ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              )}
              {testResult.ok ? 'HTTP 200 OK — Ready for Production' : 'Endpoint Test Failed'}
            </span>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              Round-trip: {testResult.latencyMs}ms · Target: {testResult.model}
            </span>
          </div>
          <p className="line-clamp-2 text-slate-300 font-mono text-[11px] bg-slate-950/60 p-2 rounded mt-1 border border-slate-800/60">
            {testResult.text}
          </p>
        </div>
      )}
    </div>
  );
};
