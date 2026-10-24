/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OneUrlBanner } from './components/OneUrlBanner';
import { ProviderCatalog } from './components/ProviderCatalog';
import { GgufEngineHub } from './components/GgufEngineHub';
import { CustomEngineManager } from './components/CustomEngineManager';
import { Playground } from './components/Playground';
import { RequestLogs } from './components/RequestLogs';
import { CodeSnippetsModal } from './components/CodeSnippetsModal';
import { AI_PROVIDERS } from './data/providers';
import { GGUF_MODELS } from './data/ggufModels';
import { 
  loadApiKeys, saveApiKey, loadCustomEngines, saveCustomEngines, 
  loadRequestLogs, appendRequestLog, clearRequestLogs 
} from './utils/storage';
import { CustomEngine, GgufModel, ApiRequestLog } from './types/router';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('providers');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [customEngines, setCustomEngines] = useState<CustomEngine[]>([]);
  const [logs, setLogs] = useState<ApiRequestLog[]>([]);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Active target engine for the single router URL
  const [activeTarget, setActiveTarget] = useState<{
    type: 'provider' | 'gguf' | 'custom-engine';
    id: string;
    name: string;
    model: string;
  }>({
    type: 'gguf',
    id: 'llama-3.2-1b-instruct-q4',
    name: 'Llama 3.2 1B Instruct',
    model: 'llama-3.2-1b-instruct-q4',
  });

  const [oneUrl, setOneUrl] = useState<string>('http://localhost:3000/api/v1/chat/completions');

  useEffect(() => {
    // Sync localStorage
    setApiKeys(loadApiKeys());
    setCustomEngines(loadCustomEngines());
    setLogs(loadRequestLogs());

    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setOneUrl(`${origin}/api/v1/chat/completions`);
    }
  }, []);

  const handleSaveKey = (providerId: string, key: string) => {
    saveApiKey(providerId, key);
    setApiKeys(loadApiKeys());
  };

  const handleSaveEngines = (updated: CustomEngine[]) => {
    saveCustomEngines(updated);
    setCustomEngines(updated);
  };

  const handleSelectActiveProvider = (providerId: string, modelId: string) => {
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    if (!provider) return;

    setActiveTarget({
      type: 'provider',
      id: provider.id,
      name: provider.name,
      model: modelId,
    });
  };

  const handleSelectActiveGguf = (model: GgufModel) => {
    setActiveTarget({
      type: 'gguf',
      id: model.id,
      name: model.name,
      model: model.id,
    });
  };

  const handleSelectActiveEngine = (engine: CustomEngine) => {
    setActiveTarget({
      type: 'custom-engine',
      id: engine.id,
      name: engine.name,
      model: engine.modelId,
    });
  };

  const handleLogRequest = (log: ApiRequestLog) => {
    appendRequestLog(log);
    setLogs(loadRequestLogs());
  };

  const handleClearLogs = () => {
    clearRequestLogs();
    setLogs([]);
  };

  const handleOpenPlaygroundWithModel = (modelId: string) => {
    const foundGguf = GGUF_MODELS.find(m => m.id === modelId);
    if (foundGguf) {
      handleSelectActiveGguf(foundGguf);
    }
    setActiveTab('playground');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Bar Contract (Wordmark, Nav Links, Copy One-URL Action) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        oneUrl={oneUrl}
        onOpenCodeModal={() => setIsCodeModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* The One-URL Universal Gateway Banner */}
        <OneUrlBanner
          oneUrl={oneUrl}
          activeTargetName={activeTarget.name}
          activeTargetType={
            activeTarget.type === 'gguf'
              ? 'Local GGUF Model'
              : activeTarget.type === 'custom-engine'
              ? 'Custom Environment'
              : 'Cloud API Provider'
          }
          onOpenPlayground={() => setActiveTab('playground')}
          onOpenCodeModal={() => setIsCodeModalOpen(true)}
        />

        {/* Dynamic Views */}
        {activeTab === 'providers' && (
          <ProviderCatalog
            providers={AI_PROVIDERS}
            apiKeys={apiKeys}
            onSaveKey={handleSaveKey}
            activeProviderId={activeTarget.type === 'provider' ? activeTarget.id : ''}
            onSelectActiveProvider={handleSelectActiveProvider}
          />
        )}

        {activeTab === 'gguf' && (
          <GgufEngineHub
            models={GGUF_MODELS}
            activeModelId={activeTarget.type === 'gguf' ? activeTarget.id : ''}
            onSelectActiveGguf={handleSelectActiveGguf}
            onOpenPlaygroundWithModel={handleOpenPlaygroundWithModel}
          />
        )}

        {activeTab === 'custom' && (
          <CustomEngineManager
            engines={customEngines}
            onSaveEngines={handleSaveEngines}
            activeEngineId={activeTarget.type === 'custom-engine' ? activeTarget.id : null}
            onSelectActiveEngine={handleSelectActiveEngine}
          />
        )}

        {activeTab === 'playground' && (
          <Playground
            providers={AI_PROVIDERS}
            ggufModels={GGUF_MODELS}
            customEngines={customEngines}
            apiKeys={apiKeys}
            activeTarget={activeTarget}
            onLogRequest={handleLogRequest}
          />
        )}

        {activeTab === 'logs' && (
          <RequestLogs
            logs={logs}
            onClearLogs={handleClearLogs}
          />
        )}
      </main>

      {/* Code Snippets Modal */}
      <CodeSnippetsModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        oneUrl={oneUrl}
        activeModel={activeTarget.model}
      />

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">NexusAI Universal Router</span>
          <span>·</span>
          <span>34 AI Connectors</span>
          <span>·</span>
          <span>3 Local GGUFs</span>
          <span>·</span>
          <span>Custom Engines</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          OpenAI-Compatible Gateway `/v1/chat/completions`
        </div>
      </footer>
    </div>
  );
}
