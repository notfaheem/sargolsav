import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      role="status"
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all animate-bounce-short ${
        isSuccess
          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
          : 'bg-red-50 border-red-300 text-red-800'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
      )}
      <span className="text-sm font-semibold">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-2 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
