import React from 'react';
import { Copy, Check, Terminal, Cpu, Database, Play, Activity, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  oneUrl: string;
  onOpenCodeModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  oneUrl,
  onOpenCodeModal,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(oneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Terminal className="w-4 h-4" />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
          NexusAI Router
        </span>
        <span className="text-xs text-slate-400 hidden sm:inline">v1.2</span>
      </div>

      {/* Zone 2: 4-5 concise single-line nav links */}
      <nav className="hidden lg:flex items-center gap-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'providers'
              ? 'bg-slate-800 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>API Providers (34)</span>
        </button>

        <button
          onClick={() => setActiveTab('gguf')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'gguf'
              ? 'bg-slate-800 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Local GGUF (3 Models)</span>
        </button>

        <button
          onClick={() => setActiveTab('custom')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'custom'
              ? 'bg-slate-800 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Custom Engines</span>
        </button>

        <button
          onClick={() => setActiveTab('playground')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'playground'
              ? 'bg-slate-800 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Playground</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'logs'
              ? 'bg-slate-800 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Request Logs</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenCodeModal}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 border border-slate-700/80 rounded-md hover:bg-slate-700/80 hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          Integrate Code
        </button>

        <button
          onClick={handleCopyUrl}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm shadow-emerald-500/20"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied URL</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy One-URL</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
