const STORAGE_KEY = 'sargolsav_diagnostics_logs';
const MAX_LOGS = 50;
const LISTENERS = new Set();

function notifyListeners() {
  const currentLogs = getLogs();
  LISTENERS.forEach((cb) => {
    try {
      cb(currentLogs);
    } catch (e) {
      console.error('Error notifying log listener:', e);
    }
  });
}

export function getLogs() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading logs from sessionStorage:', err);
    return [];
  }
}

export function addLog({ status = 'SUCCESS', action = 'GENERAL', message = '', details = null }) {
  try {
    const logs = getLogs();
    const newEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: ['SUCCESS', 'WARNING', 'ERROR'].includes(status) ? status : 'SUCCESS',
      action,
      message,
      details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
    };

    const updated = [newEntry, ...logs].slice(0, MAX_LOGS);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyListeners();
    return newEntry;
  } catch (err) {
    console.error('Failed to write log to sessionStorage:', err);
  }
}

export function clearLogs() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  } catch (err) {
    console.error('Failed to clear logs:', err);
  }
}

export function subscribeLogs(callback) {
  LISTENERS.add(callback);
  callback(getLogs());
  return () => {
    LISTENERS.delete(callback);
  };
}

export const logger = {
  success: (action, message, details) => addLog({ status: 'SUCCESS', action, message, details }),
  warn: (action, message, details) => addLog({ status: 'WARNING', action, message, details }),
  error: (action, message, details) => addLog({ status: 'ERROR', action, message, details }),
  get: getLogs,
  clear: clearLogs,
  subscribe: subscribeLogs,
};
