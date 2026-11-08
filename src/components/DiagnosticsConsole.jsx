import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Terminal, Activity, Copy, Trash2, Check, AlertCircle, RefreshCw, Database } from 'lucide-react';

export default function DiagnosticsConsole() {
  const [logs, setLogs] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = logger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return unsubscribe;
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setPingResult(null);
    const startTime = performance.now();

    try {
      // Test querying settings and items count
      const [settingsRes, itemsRes] = await Promise.all([
        supabase.from('settings').select('id').eq('id', 1).single(),
        supabase.from('items').select('code', { count: 'exact', head: true }),
      ]);

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (settingsRes.error) {
        throw new Error(`Settings table check failed: ${settingsRes.error.message}`);
      }
      if (itemsRes.error) {
        throw new Error(`Items table check failed: ${itemsRes.error.message}`);
      }

      const itemCount = itemsRes.count ?? 0;
      const successMessage = `Supabase DB Online — Latency: ${latency}ms | Verified ${itemCount} items`;

      setPingResult({
        success: true,
        latency,
        message: successMessage,
      });

      logger.success('DB_PING', successMessage, { latencyMs: latency, itemsVerified: itemCount });
    } catch (err) {
      console.error('Diagnostic DB test error:', err);
      const errorMessage = err.message || 'Connection timeout or network failure';
      setPingResult({
        success: false,
        latency: null,
        message: `Connection Failed: ${errorMessage}`,
      });
      logger.error('DB_PING', `Ping test failed: ${errorMessage}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.status}] [${l.action}] ${l.message} ${l.details ? `| Details: ${l.details}` : ''}`)
      .join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClearLogs = () => {
    logger.clear();
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Top Console Bar */}
      <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <span>System Diagnostics & Activity Console</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Live audit trail of festival mutations, Supabase operations, and import jobs
            </p>
          </div>
        </div>

        {/* Console Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            <span>{isTesting ? 'Testing DB...' : 'Test Database Connection'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer disabled:opacity-40"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Logs'}</span>
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-all cursor-pointer disabled:opacity-40"
            title="Clear console logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Ping Status Banner (if run) */}
      {pingResult && (
        <div
          className={`px-5 py-2.5 text-xs font-mono font-medium flex items-center justify-between border-b ${
            pingResult.success
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50'
              : 'bg-red-950/40 text-red-300 border-red-900/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />
            <span>{pingResult.message}</span>
          </div>
          {pingResult.latency !== null && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
              {pingResult.latency} ms
            </span>
          )}
        </div>
      )}

      {/* Terminal Output Area */}
      <div className="p-4 font-mono text-xs max-h-72 min-h-36 overflow-y-auto space-y-1.5 bg-slate-900/90 select-text">
        {logs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 italic">
            Console ready. No events logged yet. Supabase queries and participant imports will appear here in real time.
          </div>
        ) : (
          logs.map((log) => {
            let statusColor = 'text-emerald-400';
            let badgeBg = 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';

            if (log.status === 'WARNING') {
              statusColor = 'text-amber-400';
              badgeBg = 'bg-amber-900/40 text-amber-300 border-amber-700/50';
            } else if (log.status === 'ERROR') {
              statusColor = 'text-red-400';
              badgeBg = 'bg-red-900/40 text-red-300 border-red-700/50';
            }

            return (
              <div
                key={log.id}
                className="flex items-start gap-2.5 py-1 px-2 rounded hover:bg-slate-800/60 transition-colors"
              >
                <span className="text-slate-500 shrink-0 text-[11px] select-none">
                  {log.timestamp}
                </span>

                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${badgeBg}`}
                >
                  {log.status}
                </span>

                <span className="text-sky-400 font-semibold shrink-0">
                  [{log.action}]
                </span>

                <span className={`flex-1 break-words ${statusColor}`}>
                  {log.message}
                  {log.details && (
                    <span className="text-slate-400 ml-1.5 opacity-80 text-[11px]">
                      {log.details}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
