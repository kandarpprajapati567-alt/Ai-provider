import React, { useState } from 'react';
import { AIProvider, ProviderCategory } from '../types/router';
import { 
  Key, ExternalLink, Check, Eye, EyeOff, Search, Zap, 
  BookOpen, Activity, ArrowRight, ShieldCheck, Trash2 
} from 'lucide-react';

interface ProviderCatalogProps {
  providers: AIProvider[];
  apiKeys: Record<string, string>;
  onSaveKey: (providerId: string, key: string) => void;
  activeProviderId: string;
  onSelectActiveProvider: (providerId: string, modelId: string) => void;
}

export const ProviderCatalog: React.FC<ProviderCatalogProps> = ({
  providers,
  apiKeys,
  onSaveKey,
  activeProviderId,
  onSelectActiveProvider,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [pingStates, setPingStates] = useState<Record<string, { status: 'idle' | 'testing' | 'success' | 'error'; latencyMs?: number; message?: string }>>({});

  const categories: { id: ProviderCategory | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'All Providers', count: providers.length },
    { id: 'frontier', label: 'Frontier AI', count: providers.filter(p => p.category === 'frontier').length },
    { id: 'ultrafast', label: 'Ultra-Fast LPUs', count: providers.filter(p => p.category === 'ultrafast').length },
    { id: 'opensource', label: 'Open Source GPU', count: providers.filter(p => p.category === 'opensource').length },
    { id: 'aggregator', label: 'Aggregators', count: providers.filter(p => p.category === 'aggregator').length },
    { id: 'specialized', label: 'Search & Specialized', count: providers.filter(p => p.category === 'specialized' || p.category === 'embeddings').length },
  ];

  const filteredProviders = providers.filter(p => {
    const matchesCategory = selectedCategory === 'all' 
      ? true 
      : selectedCategory === 'specialized'
        ? (p.category === 'specialized' || p.category === 'embeddings')
        : p.category === selectedCategory;

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.models.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.id.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const toggleKeyVisibility = (providerId: string) => {
    setVisibleKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const handleKeyChange = (providerId: string, val: string) => {
    setKeyDrafts(prev => ({ ...prev, [providerId]: val }));
  };

  const handleSaveKey = (providerId: string) => {
    const draft = keyDrafts[providerId] !== undefined ? keyDrafts[providerId] : (apiKeys[providerId] || '');
    onSaveKey(providerId, draft);
    setKeyDrafts(prev => {
      const next = { ...prev };
      delete next[providerId];
      return next;
    });
  };

  const handleClearKey = (providerId: string) => {
    onSaveKey(providerId, '');
    setKeyDrafts(prev => {
      const next = { ...prev };
      delete next[providerId];
      return next;
    });
  };

  const handlePing = async (provider: AIProvider) => {
    setPingStates(prev => ({ ...prev, [provider.id]: { status: 'testing' } }));
    const currentKey = keyDrafts[provider.id] || apiKeys[provider.id] || '';

    try {
      const authHeaderVal = provider.authHeader.replace('{key}', currentKey);
      const headers: Record<string, string> = {};
      if (currentKey) {
        if (provider.authHeaderName) {
          headers[provider.authHeaderName] = authHeaderVal;
        } else {
          headers['Authorization'] = authHeaderVal;
        }
      }

      const res = await fetch('/api/v1/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: provider.baseUrl,
          headers,
        }),
      });

      const data = await res.json();
      if (data.ok || data.status < 500) {
        setPingStates(prev => ({
          ...prev,
          [provider.id]: {
            status: 'success',
            latencyMs: data.latencyMs,
            message: `Reachability verified (${data.latencyMs}ms)`,
          },
        }));
      } else {
        setPingStates(prev => ({
          ...prev,
          [provider.id]: {
            status: 'error',
            latencyMs: data.latencyMs,
            message: data.error || `HTTP ${data.status}`,
          },
        }));
      }
    } catch (err: any) {
      setPingStates(prev => ({
        ...prev,
        [provider.id]: {
          status: 'error',
          message: err.message || 'Network check failed',
        },
      }));
    }
  };

  const configuredKeyCount = Object.keys(apiKeys).filter(k => apiKeys[k]?.trim()).length;

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Universal AI Provider Connectors
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Catalog of {providers.length} AI providers. Paste your API key or click &quot;Get API Key&quot; directly to route queries.
            <span className="text-emerald-400 ml-2 font-medium">({configuredKeyCount} configured)</span>
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search provider or model..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 border-b-2 ${
              selectedCategory === cat.id
                ? 'border-emerald-400 text-emerald-300 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <span>{cat.label}</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded">
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Provider Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProviders.map(provider => {
          const hasKey = Boolean(apiKeys[provider.id]?.trim());
          const currentDraft = keyDrafts[provider.id] !== undefined ? keyDrafts[provider.id] : (apiKeys[provider.id] || '');
          const isKeyVisible = Boolean(visibleKeys[provider.id]);
          const isPrimary = activeProviderId === provider.id;
          const activeModelId = selectedModels[provider.id] || provider.defaultModel;
          const ping = pingStates[provider.id];

          return (
            <div
              key={provider.id}
              className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-all ${
                isPrimary
                  ? 'border-emerald-500/80 shadow-md shadow-emerald-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header Row: Title & Badges */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white tracking-tight">
                        {provider.name}
                      </h3>
                      {isPrimary && (
                        <span className="text-[10px] uppercase tracking-wider font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          Active Target
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 capitalize">
                      {provider.category} · {provider.isOpenAiCompatible ? 'OpenAI Compatible' : 'Custom Schema Adapter'}
                    </span>
                  </div>

                  {/* Direct Link to Get API Key */}
                  <a
                    href={provider.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 border border-emerald-500/30"
                  >
                    <span>Get API Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {provider.description}
                </p>

                {/* API Key Input Section (Requested by user) */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span>API Key</span>
                      {hasKey && (
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 ml-1">
                          <ShieldCheck className="w-3 h-3" /> Configured
                        </span>
                      )}
                    </label>

                    <div className="flex items-center gap-2">
                      {hasKey && (
                        <button
                          onClick={() => handleClearKey(provider.id)}
                          className="text-slate-500 hover:text-rose-400 text-[11px] flex items-center gap-1 transition-colors"
                          title="Remove key"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type={isKeyVisible ? 'text' : 'password'}
                        value={currentDraft}
                        placeholder={hasKey ? '••••••••••••••••••••' : 'Paste API Key here...'}
                        onChange={e => handleKeyChange(provider.id, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(provider.id)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        title={isKeyVisible ? 'Hide key' : 'Show key'}
                      >
                        {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      onClick={() => handleSaveKey(provider.id)}
                      disabled={currentDraft === (apiKeys[provider.id] || '')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 border border-slate-700 transition-colors shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Model Selector & Base URL Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Default Model</span>
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Docs</span>
                    </a>
                  </div>

                  <select
                    value={activeModelId}
                    onChange={e => setSelectedModels(prev => ({ ...prev, [provider.id]: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {provider.models.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({Math.round(m.context / 1000)}k ctx {m.inputCostPer1M ? `· ${m.inputCostPer1M}` : ''})
                      </option>
                    ))}
                  </select>

                  <div className="text-[11px] font-mono text-slate-500 truncate" title={provider.baseUrl}>
                    Base: {provider.baseUrl}
                  </div>
                </div>
              </div>

              {/* Card Footer: Status Ping & Route Action */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handlePing(provider)}
                  disabled={ping?.status === 'testing'}
                  className="px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors flex items-center gap-1.5"
                >
                  <Activity className="w-3 h-3 text-slate-400" />
                  <span>{ping?.status === 'testing' ? 'Pinging...' : 'Ping Test'}</span>
                </button>

                {ping && ping.status !== 'idle' && (
                  <span className={`text-[11px] font-mono ${
                    ping.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {ping.status === 'success' ? `${ping.latencyMs}ms` : 'Offline'}
                  </span>
                )}

                <button
                  onClick={() => onSelectActiveProvider(provider.id, activeModelId)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                    isPrimary
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <span>{isPrimary ? 'Selected' : 'Route Here'}</span>
                  {!isPrimary && <ArrowRight className="w-3 h-3" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
