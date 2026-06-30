import { useEffect, useRef, useState } from 'react'
import { setLogListener, exportLogs } from '../utils/logger.js'
import { X, CopySimple, ArrowsOutSimple, ArrowsInSimple, Trash } from '@phosphor-icons/react'

const CATEGORY_COLORS = {
  ROOM: 'text-sky-400',
  AGENT: 'text-violet-400',
  DATA: 'text-amber-400',
  VAD: 'text-lime-400',
  STT: 'text-teal-400',
  TTS: 'text-pink-400',
  UI: 'text-slate-400',
  NET: 'text-orange-400',
  ERR: 'text-red-400',
}

export function LogPanel({ onClose }) {
  const [entries, setEntries] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState('')
  const bottomRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    setLogListener(setEntries)
    return () => setLogListener(null)
  }, [])

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [entries, autoScroll])

  const filtered = filter
    ? entries.filter(
        (e) =>
          e.category.toLowerCase().includes(filter.toLowerCase()) ||
          e.message.toLowerCase().includes(filter.toLowerCase()) ||
          (e.data && e.data.toLowerCase().includes(filter.toLowerCase()))
      )
    : entries

  function copyLogs() {
    navigator.clipboard.writeText(exportLogs()).catch(() => {})
  }

  function clearLogs() {
    setEntries([])
  }

  return (
    <div
      className={`fixed bottom-0 right-0 z-[100] bg-[#0f1117] border border-slate-700 rounded-tl-2xl flex flex-col font-mono text-xs shadow-2xl transition-all ${
        expanded ? 'w-full h-[60vh]' : 'w-[640px] h-72'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700 flex-shrink-0">
        <span className="text-slate-300 font-semibold tracking-wide text-[11px]">
          LOG PANEL
        </span>
        <span className="text-slate-600 text-[10px] ml-1">{filtered.length} entries</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter..."
          className="ml-2 bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-slate-300 placeholder-slate-600 text-[11px] w-32 focus:outline-none focus:border-slate-400"
        />
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setAutoScroll((v) => !v)}
            title="Toggle auto-scroll"
            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
              autoScroll
                ? 'border-sky-500 text-sky-400'
                : 'border-slate-600 text-slate-500'
            }`}
          >
            SCROLL
          </button>
          <button onClick={clearLogs} title="Clear" className="text-slate-500 hover:text-slate-300 p-1">
            <Trash size={13} />
          </button>
          <button onClick={copyLogs} title="Copy all logs" className="text-slate-500 hover:text-slate-300 p-1">
            <CopySimple size={13} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-slate-500 hover:text-slate-300 p-1"
          >
            {expanded ? <ArrowsInSimple size={13} /> : <ArrowsOutSimple size={13} />}
          </button>
          <button onClick={onClose} className="text-slate-500 hover:text-red-400 p-1">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Category key */}
      <div className="flex gap-2 px-3 py-1 border-b border-slate-800 flex-shrink-0 flex-wrap">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <button
            key={cat}
            onClick={() => setFilter(filter === cat ? '' : cat)}
            className={`${color} text-[10px] font-bold opacity-70 hover:opacity-100 transition-opacity ${
              filter === cat ? 'opacity-100 underline' : ''
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Log entries — newest on top */}
      <div
        className="flex-1 overflow-y-auto px-3 py-1 flex flex-col-reverse gap-0.5"
        onScroll={(e) => {
          const el = e.currentTarget
          const atBottom = el.scrollTop === 0
          setAutoScroll(atBottom)
        }}
      >
        <div ref={bottomRef} />
        {filtered.map((entry) => (
          <div key={entry.id} className="flex gap-2 items-start leading-5 min-w-0">
            <span className="text-slate-600 flex-shrink-0 text-[10px] pt-0.5">{entry.ts}</span>
            <span
              className={`font-bold flex-shrink-0 w-12 text-[10px] pt-0.5 ${
                CATEGORY_COLORS[entry.category] || 'text-slate-400'
              }`}
            >
              {entry.category}
            </span>
            <span className="text-slate-200 break-all">
              {entry.message}
              {entry.data && (
                <span className="text-slate-500 ml-1">{entry.data}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
