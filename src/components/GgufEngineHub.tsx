import React, { useState } from 'react';
import { GgufModel, GgufHeaderMetadata } from '../types/router';
import { parseGgufFromBuffer } from '../utils/ggufParser';
import { 
  Cpu, Download, Play, Terminal, Check, Copy, UploadCloud, 
  FileCode, Layers, Info, CheckCircle2, AlertCircle, RefreshCw 
} from 'lucide-react';

interface GgufEngineHubProps {
  models: GgufModel[];
  activeModelId: string;
  onSelectActiveGguf: (model: GgufModel) => void;
  onOpenPlaygroundWithModel: (modelId: string) => void;
}

export const GgufEngineHub: React.FC<GgufEngineHubProps> = ({
  models,
  activeModelId,
  onSelectActiveGguf,
  onOpenPlaygroundWithModel,
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [parsedMetadata, setParsedMetadata] = useState<GgufHeaderMetadata | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [localServerStatus, setLocalServerStatus] = useState<{
    tested: boolean;
    online: boolean;
    latencyMs?: number;
    url: string;
  }>({
    tested: false,
    online: false,
    url: 'http://localhost:8080/v1',
  });

  const handleCopyCmd = (id: string, cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingFile(true);
    setParseError(null);
    setParsedMetadata(null);

    try {
      // Read the first 1MB of the GGUF file to extract metadata header
      const sliceSize = Math.min(file.size, 1024 * 1024);
      const slice = file.slice(0, sliceSize);
      const buffer = await slice.arrayBuffer();
      const meta = parseGgufFromBuffer(buffer);
      setParsedMetadata(meta);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse GGUF binary format. Ensure this is a valid .gguf file.');
    } finally {
      setParsingFile(false);
    }
  };

  const checkLocalLlamaServer = async () => {
    setLocalServerStatus(prev => ({ ...prev, tested: true }));
    const start = Date.now();
    try {
      const res = await fetch('/api/v1/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: localServerStatus.url }),
      });
      const data = await res.json();
      setLocalServerStatus({
        tested: true,
        online: data.ok || (data.status && data.status < 500),
        latencyMs: Date.now() - start,
        url: localServerStatus.url,
      });
    } catch {
      setLocalServerStatus({
        tested: true,
        online: false,
        url: localServerStatus.url,
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Local GGUF Model Execution Hub
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              3 Pre-Configured Models
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Run quantized GGUF weights locally via llama.cpp or Web edge execution. 
            All models are directly callable through the single universal router URL.
          </p>
        </div>

        {/* Local llama-server status bridge */}
        <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-mono text-slate-300">
            <span className={`w-2 h-2 rounded-full ${
              localServerStatus.tested 
                ? (localServerStatus.online ? 'bg-emerald-400' : 'bg-amber-500') 
                : 'bg-slate-600'
            }`} />
            <span>llama-server (:8080)</span>
          </div>

          <button
            onClick={checkLocalLlamaServer}
            className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3 text-slate-400" />
            <span>{localServerStatus.tested ? (localServerStatus.online ? 'Connected' : 'Offline') : 'Check Bridge'}</span>
          </button>
        </div>
      </div>

      {/* 3 Working GGUF Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {models.map(model => {
          const isActive = activeModelId === model.id;
          const isCopied = copiedCmd === model.id;

          return (
            <div
              key={model.id}
              className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-all ${
                isActive
                  ? 'border-emerald-500/80 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        {model.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mt-0.5">
                        <span>{model.parameterCount}</span>
                        <span>·</span>
                        <span className="text-emerald-400">{model.quantization}</span>
                        <span>·</span>
                        <span>{model.fileSizeMb} MB</span>
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                  {model.description}
                </p>

                {/* Specs Box */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 space-y-2 mb-4 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Architecture:</span>
                    <span className="text-slate-200">{model.architecture}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Context Window:</span>
                    <span className="text-slate-200">{model.contextWindow.toLocaleString()} tokens</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Est. Inference Speed:</span>
                    <span className="text-emerald-400">{model.benchmarkTps} tok/s</span>
                  </div>
                </div>

                {/* Command Snippet */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-slate-500" />
                      <span>Launch in llama.cpp:</span>
                    </span>
                    <button
                      onClick={() => handleCopyCmd(model.id, model.recommendedLlamaCppCommand)}
                      className="text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded p-2 font-mono text-[11px] text-slate-300 select-all break-all overflow-x-auto">
                    {model.recommendedLlamaCppCommand}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <a
                  href={model.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download GGUF</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenPlaygroundWithModel(model.id)}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                    title="Test prompt in playground"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSelectActiveGguf(model)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {isActive ? 'Routing Active' : 'Set as Router Target'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload and Parse Custom GGUF File */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>GGUF File Header & Tensor Inspector</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select or drop any local <code className="text-emerald-400 font-mono">.gguf</code> model file from your computer. 
              The built-in binary parser validates the magic header, counts tensors, and reads architecture metadata.
            </p>
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center bg-slate-950/50 transition-colors">
          <input
            type="file"
            id="gguf-upload"
            accept=".gguf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label
            htmlFor="gguf-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-2"
          >
            <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-300">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-xs font-medium text-slate-200">
              <span className="text-emerald-400 underline underline-offset-2">Click to inspect local GGUF</span> or drag and drop
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Accepts .gguf binary files (Llama, Mistral, Qwen, DeepSeek, Gemma, Phi)
            </div>
          </label>
        </div>

        {parsingFile && (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Reading binary header and parsing tensor table...</span>
          </div>
        )}

        {parseError && (
          <div className="mt-4 p-3 bg-rose-950/50 border border-rose-800/80 rounded-lg text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {parsedMetadata && (
          <div className="mt-6 border border-slate-800 rounded-lg bg-slate-950 p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Valid GGUF Model Header Verified</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Magic: {parsedMetadata.magic} · Format Version {parsedMetadata.version}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <div className="text-slate-500 text-[11px]">Architecture</div>
                <div className="text-white font-semibold mt-0.5">{parsedMetadata.architecture}</div>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <div className="text-slate-500 text-[11px]">Tensor Count</div>
                <div className="text-emerald-400 font-semibold mt-0.5">{parsedMetadata.tensorCount.toLocaleString()} tensors</div>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <div className="text-slate-500 text-[11px]">Metadata KV Count</div>
                <div className="text-white font-semibold mt-0.5">{parsedMetadata.metadataKvCount} entries</div>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <div className="text-slate-500 text-[11px]">Context Length</div>
                <div className="text-white font-semibold mt-0.5">{parsedMetadata.contextLength?.toLocaleString()} tokens</div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Extracted Key-Value Metadata:</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800/80 rounded p-3 font-mono text-[11px] max-h-48 overflow-y-auto text-slate-300">
                <pre>{JSON.stringify(parsedMetadata.rawMetadata, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
