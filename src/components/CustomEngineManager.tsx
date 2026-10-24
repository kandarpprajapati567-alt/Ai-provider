import React, { useState } from 'react';
import { CustomEngine } from '../types/router';
import { 
  Sparkles, Plus, Trash2, Edit2, Activity, Check, 
  ExternalLink, Server, Globe, Shield, RefreshCw 
} from 'lucide-react';

interface CustomEngineManagerProps {
  engines: CustomEngine[];
  onSaveEngines: (engines: CustomEngine[]) => void;
  activeEngineId: string | null;
  onSelectActiveEngine: (engine: CustomEngine) => void;
}

export const CustomEngineManager: React.FC<CustomEngineManagerProps> = ({
  engines,
  onSaveEngines,
  activeEngineId,
  onSelectActiveEngine,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEngineId, setEditingEngineId] = useState<string | null>(null);
  const [pingStates, setPingStates] = useState<Record<string, { status: 'idle' | 'testing' | 'success' | 'error'; latencyMs?: number; message?: string }>>({});

  // Form state
  const [formData, setFormData] = useState<Partial<CustomEngine>>({
    name: '',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    modelId: 'llama3.2',
    protocol: 'openai',
    timeoutMs: 30000,
    isActive: true,
    notes: '',
  });

  const handleOpenAdd = () => {
    setEditingEngineId(null);
    setFormData({
      name: '',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: '',
      modelId: 'llama3.2',
      protocol: 'openai',
      timeoutMs: 30000,
      isActive: true,
      notes: '',
    });
    setShowAddForm(true);
  };

  const handleOpenEdit = (engine: CustomEngine) => {
    setEditingEngineId(engine.id);
    setFormData({ ...engine });
    setShowAddForm(true);
  };

  const handlePresetSelect = (preset: { name: string; url: string; model: string; key: string }) => {
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      baseUrl: preset.url,
      modelId: preset.model,
      apiKey: preset.key,
    }));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.baseUrl?.trim()) return;

    if (editingEngineId) {
      const updated = engines.map(eng => 
        eng.id === editingEngineId 
          ? { ...(eng), ...(formData as CustomEngine), id: editingEngineId }
          : eng
      );
      onSaveEngines(updated);
    } else {
      const newEngine: CustomEngine = {
        id: `custom-engine-${Date.now()}`,
        name: formData.name.trim(),
        baseUrl: formData.baseUrl.trim(),
        apiKey: formData.apiKey || '',
        modelId: formData.modelId?.trim() || 'default',
        protocol: formData.protocol || 'openai',
        timeoutMs: formData.timeoutMs || 30000,
        isActive: true,
        notes: formData.notes || '',
        lastPingStatus: 'unknown',
      };
      onSaveEngines([...engines, newEngine]);
    }

    setShowAddForm(false);
    setEditingEngineId(null);
  };

  const handleDeleteEngine = (id: string) => {
    onSaveEngines(engines.filter(e => e.id !== id));
  };

  const handlePingEngine = async (engine: CustomEngine) => {
    setPingStates(prev => ({ ...prev, [engine.id]: { status: 'testing' } }));
    const start = Date.now();
    try {
      const headers: Record<string, string> = {};
      if (engine.apiKey) {
        headers['Authorization'] = `Bearer ${engine.apiKey}`;
      }

      const res = await fetch('/api/v1/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: engine.baseUrl,
          headers,
        }),
      });

      const data = await res.json();
      const latency = Date.now() - start;

      if (data.ok || (data.status && data.status < 500)) {
        setPingStates(prev => ({
          ...prev,
          [engine.id]: {
            status: 'success',
            latencyMs: data.latencyMs || latency,
            message: `Engine reachable (${data.latencyMs || latency}ms)`,
          },
        }));
      } else {
        setPingStates(prev => ({
          ...prev,
          [engine.id]: {
            status: 'error',
            latencyMs: latency,
            message: data.error || `HTTP ${data.status}`,
          },
        }));
      }
    } catch (err: any) {
      setPingStates(prev => ({
        ...prev,
        [engine.id]: {
          status: 'error',
          message: err.message || 'Connection failed',
        },
      }));
    }
  };

  const presets = [
    { name: 'Local Ollama', url: 'http://localhost:11434/v1', model: 'llama3.2', key: 'ollama' },
    { name: 'llama.cpp Server', url: 'http://localhost:8080/v1', model: 'default', key: '' },
    { name: 'LM Studio', url: 'http://localhost:1234/v1', model: 'local-model', key: '' },
    { name: 'vLLM Instance', url: 'http://localhost:8000/v1', model: 'Qwen/Qwen2.5-7B-Instruct', key: '' },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Insert Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>Custom AI Engine & Environment Manager</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Insert your own private AI engine, Ollama setup, vLLM instance, or local llama.cpp server. 
            Once inserted, the single universal router URL forwards requests directly to your environment.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 self-start md:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Insert New Engine</span>
        </button>
      </div>

      {/* Add / Edit Form Modal / Card */}
      {showAddForm && (
        <div className="bg-slate-900 border border-emerald-500/50 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">
              {editingEngineId ? 'Edit Custom AI Engine' : 'Insert Custom AI Engine / Environment'}
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-400">Quick Presets:</span>
            <div className="flex flex-wrap gap-2">
              {presets.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handlePresetSelect(p)}
                  className="px-2.5 py-1 text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition-colors font-mono"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveForm} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Engine / Environment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Home GPU Rig (vLLM)"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Base API URL (OpenAI Compatible) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="http://localhost:11434/v1"
                  value={formData.baseUrl || ''}
                  onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Model Identifier / Target Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. llama3.2, mistral-7b, qwen2.5"
                  value={formData.modelId || ''}
                  onChange={e => setFormData({ ...formData, modelId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  API Key / Bearer Token (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Leave blank if no auth required"
                  value={formData.apiKey || ''}
                  onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
              >
                {editingEngineId ? 'Update Engine' : 'Insert Engine'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Engine List */}
      <div className="space-y-3">
        {engines.map(engine => {
          const isSelected = activeEngineId === engine.id;
          const ping = pingStates[engine.id];

          return (
            <div
              key={engine.id}
              className={`bg-slate-900 border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                isSelected
                  ? 'border-emerald-500/80 shadow-md shadow-emerald-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start md:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                  <Server className="w-4 h-4 text-emerald-400" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {engine.name}
                    </h3>
                    {isSelected && (
                      <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        Active Gateway Target
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 mt-1 font-mono">
                    <span className="text-slate-300">{engine.baseUrl}</span>
                    <span>·</span>
                    <span className="text-emerald-400">model: {engine.modelId}</span>
                    <span>·</span>
                    <span>{engine.apiKey ? 'Auth Enabled' : 'No Auth'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  onClick={() => handlePingEngine(engine)}
                  disabled={ping?.status === 'testing'}
                  className="px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors flex items-center gap-1.5"
                >
                  <Activity className="w-3 h-3 text-slate-400" />
                  <span>{ping?.status === 'testing' ? 'Testing...' : 'Test Ping'}</span>
                </button>

                {ping && ping.status !== 'idle' && (
                  <span className={`text-[11px] font-mono ${
                    ping.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {ping.status === 'success' ? `${ping.latencyMs}ms` : 'Failed'}
                  </span>
                )}

                <button
                  onClick={() => handleOpenEdit(engine)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 rounded border border-slate-700"
                  title="Edit engine configuration"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteEngine(engine.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-700/80 rounded border border-slate-700"
                  title="Delete engine"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onSelectActiveEngine(engine)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Active Route</span>
                    </>
                  ) : (
                    <span>Route One-URL Here</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {engines.length === 0 && (
          <div className="text-center py-8 bg-slate-900 border border-slate-800 rounded-xl">
            <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">No Custom Engines Configured</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Click &quot;Insert New Engine&quot; above to connect your local Ollama, llama.cpp, or remote private GPU cluster.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
