import React, { useState } from 'react';
import { ApiRequestLog } from '../types/router';
import { 
  Activity, Trash2, Download, CheckCircle2, AlertCircle, 
  Clock, ArrowRight, Eye, X 
} from 'lucide-react';

interface RequestLogsProps {
  logs: ApiRequestLog[];
  onClearLogs: () => void;
}

export const RequestLogs: React.FC<RequestLogsProps> = ({ logs, onClearLogs }) => {
  const [selectedLog, setSelectedLog] = useState<ApiRequestLog | null>(null);

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nexus_router_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Router Request Inspector & Telemetry</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry of all incoming requests processed via the single universal router URL.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {logs.length > 0 && (
            <>
              <button
                onClick={handleExportJson}
                className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={onClearLogs}
                className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-rose-200 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {logs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Activity className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-300">No Request Logs Recorded Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Send a query through the Playground or plug the One-URL into your client application to see real-time logs here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Timestamp</th>
                  <th className="py-2.5 px-3 font-medium">Method</th>
                  <th className="py-2.5 px-3 font-medium">Requested Model</th>
                  <th className="py-2.5 px-3 font-medium">Routed Engine</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Latency</th>
                  <th className="py-2.5 px-3 font-medium text-right">Tokens</th>
                  <th className="py-2.5 px-4 font-medium text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map(log => {
                  const isOk = log.statusCode >= 200 && log.statusCode < 300;
                  const dateStr = new Date(log.timestamp).toLocaleTimeString();

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-850/50 transition-colors text-slate-300"
                    >
                      <td className="py-2.5 px-4 tabular-nums text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-400 font-semibold">
                          {log.method}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-white font-medium truncate max-w-[140px]" title={log.requestedModel}>
                        {log.requestedModel}
                      </td>

                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-[180px]">
                        <span className="text-emerald-400 mr-1">→</span>
                        {log.routedTo?.name || 'Gateway Engine'}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            isOk ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isOk ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {log.statusCode}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-300 whitespace-nowrap">
                        {log.latencyMs}ms
                      </td>

                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-400 whitespace-nowrap">
                        {log.promptTokens || 0} / {log.completionTokens || 0}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          title="View request details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">Request Trace</span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {selectedLog.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="text-slate-500 text-[11px]">Status Code</div>
                <div className="text-white font-semibold mt-0.5">{selectedLog.statusCode} OK</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="text-slate-500 text-[11px]">Latency</div>
                <div className="text-emerald-400 font-semibold mt-0.5">{selectedLog.latencyMs}ms</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="text-slate-500 text-[11px]">Target Type</div>
                <div className="text-white font-semibold mt-0.5 capitalize">{selectedLog.routedTo?.type}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="text-slate-500 text-[11px]">Total Tokens</div>
                <div className="text-white font-semibold mt-0.5">
                  {(selectedLog.promptTokens || 0) + (selectedLog.completionTokens || 0)}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Prompt Preview:</span>
              <div className="bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-200">
                {selectedLog.promptPreview || 'N/A'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Response Payload Snippet:</span>
              <div className="bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-300 font-mono max-h-40 overflow-y-auto">
                {selectedLog.responsePreview || 'N/A'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
