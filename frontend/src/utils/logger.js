// Lightweight module-level logger. Any file can import { log } and write to it.
// LogPanel registers a listener to receive updates without prop drilling.

const MAX_ENTRIES = 300

let _entries = []
let _listener = null

export const CATEGORY = {
  ROOM: 'ROOM',
  AGENT: 'AGENT',
  DATA: 'DATA',
  VAD: 'VAD',
  STT: 'STT',
  TTS: 'TTS',
  UI: 'UI',
  NET: 'NET',
  ERR: 'ERR',
}

export function setLogListener(fn) {
  _listener = fn
}

export function log(category, message, data) {
  const now = new Date()
  const ts = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0')
  const entry = {
    id: `${Date.now()}-${Math.random()}`,
    ts,
    category,
    message,
    data: data !== undefined ? (typeof data === 'string' ? data : JSON.stringify(data)) : null,
  }
  _entries = [entry, ..._entries].slice(0, MAX_ENTRIES)
  _listener?.([..._entries])
}

export function getLogs() {
  return [..._entries]
}

export function exportLogs() {
  return _entries
    .slice()
    .reverse()
    .map((e) => `[${e.ts}] [${e.category}] ${e.message}${e.data ? ' | ' + e.data : ''}`)
    .join('\n')
}
