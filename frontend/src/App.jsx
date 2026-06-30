import { useCallback, useEffect, useRef, useState } from 'react'
import { RoomAudioRenderer, RoomContext, useTrackTranscription, useVoiceAssistant } from '@livekit/components-react'
import { ArrowLeft, ArrowRight, WarningCircle, Terminal } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'motion/react'

import { SLIDES } from './data/slides.js'
import { useLiveKit } from './hooks/useLiveKit.js'
import { SlideDeck } from './components/SlideDeck.jsx'
import { SlideFullscreen } from './components/SlideFullscreen.jsx'
import { VoiceInterface } from './components/VoiceInterface.jsx'
import { LogPanel } from './components/LogPanel.jsx'
import { log, CATEGORY } from './utils/logger.js'

const AGENT_STATE_MAP = {
  disconnected: 'IDLE',
  connecting: 'IDLE',
  initializing: 'IDLE',
  listening: 'LISTENING',
  thinking: 'PROCESSING',
  speaking: 'AI_RESPONDING',
}

function AgentBridge({ onAgentState, onTranscript }) {
  const { state, audioTrack } = useVoiceAssistant()
  const { segments } = useTrackTranscription(audioTrack)

  useEffect(() => {
    const mapped = AGENT_STATE_MAP[state] || 'IDLE'
    log(CATEGORY.AGENT, `useVoiceAssistant state → ${state} (mapped: ${mapped})`, {
      hasAudioTrack: !!audioTrack,
      trackSid: audioTrack?.publication?.trackSid,
    })
    onAgentState(mapped, audioTrack)
  }, [state, audioTrack, onAgentState])

  useEffect(() => {
    if (!segments || segments.length === 0) return
    const text = segments.map((s) => s.text).join(' ').trim()
    log(CATEGORY.TTS, 'Transcription segments received', { count: segments.length, text: text.slice(0, 120) })
    if (text) onTranscript(text)
  }, [segments, onTranscript])

  return null
}

// --- Sidebar: slide topic navigator ---
function SidebarNav({ currentSlide, onNavigate }) {
  return (
    <nav className="w-48 flex-shrink-0 flex flex-col py-1 border-r border-slate-100 pr-4">
      <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-3 px-3">
        Topics
      </p>
      {SLIDES.map((slide, i) => (
        <button
          key={i}
          onClick={() => onNavigate(i)}
          className={`group text-left px-3 py-2 rounded-xl text-xs transition-colors leading-snug ${
            i === currentSlide
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span
            className={`inline-block text-[10px] font-mono mr-1.5 ${
              i === currentSlide ? 'text-blue-400' : 'text-slate-300 group-hover:text-slate-400'
            }`}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          {slide.title}
        </button>
      ))}
    </nav>
  )
}

function SlideNav({ currentSlide, total, onPrev, onNext }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPrev}
        disabled={currentSlide === 0}
        aria-label="Previous slide"
        className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowLeft size={16} weight="bold" />
      </button>
      <span className="text-xs text-slate-400 tabular-nums">
        {currentSlide + 1} / {total}
      </span>
      <button
        onClick={onNext}
        disabled={currentSlide === total - 1}
        aria-label="Next slide"
        className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowRight size={16} weight="bold" />
      </button>
    </div>
  )
}

function ConnectionError({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-sm text-red-700"
    >
      <WarningCircle size={18} weight="fill" className="flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={onRetry}
        className="text-xs font-medium underline underline-offset-2 hover:text-red-900"
      >
        Retry
      </button>
    </motion.div>
  )
}

export default function App() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(1)
  const [agentState, setAgentState] = useState('IDLE')
  const [agentAudioTrack, setAgentAudioTrack] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [fullscreenSlide, setFullscreenSlide] = useState(null)
  const [showLogs, setShowLogs] = useState(false)
  const transcriptFlashRef = useRef(null)

  const handleNavigate = useCallback(
    (newIndex) => {
      if (newIndex === currentSlide) return
      log(CATEGORY.UI, `handleNavigate: ${currentSlide} → ${newIndex}`)
      setDirection(newIndex > currentSlide ? 1 : -1)
      setCurrentSlide(newIndex)
    },
    [currentSlide]
  )

  const { room, connectionState, error, micStream, micEnabled, connect, disconnect, enableMic, disableMic } =
    useLiveKit({ onNavigate: handleNavigate })

  useEffect(() => {
    log(CATEGORY.UI, 'App mounted — calling connect()')
    connect()
    return () => {
      log(CATEGORY.UI, 'App unmounting — calling disconnect()')
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    log(CATEGORY.ROOM, `connectionState → ${connectionState}`)
  }, [connectionState])

  const handleAgentState = useCallback((newState, audioTrack) => {
    setAgentState(newState)
    setAgentAudioTrack(audioTrack ?? null)
  }, [])

  useEffect(() => {
    if (agentState === 'AI_RESPONDING') {
      if (transcriptFlashRef.current) clearTimeout(transcriptFlashRef.current)
    }
    if (agentState === 'IDLE') {
      transcriptFlashRef.current = setTimeout(() => setTranscript(''), 1500)
    }
    return () => {
      if (transcriptFlashRef.current) clearTimeout(transcriptFlashRef.current)
    }
  }, [agentState])

  useEffect(() => {
    log(CATEGORY.AGENT, `agentState UI → ${agentState}`)
  }, [agentState])

  const handleMicToggle = useCallback(() => {
    if (micEnabled) {
      disableMic()
    } else {
      enableMic()
    }
  }, [micEnabled, enableMic, disableMic])

  const handleSidebarNavigate = useCallback(
    (index) => {
      if (index === currentSlide) return
      setDirection(index > currentSlide ? 1 : -1)
      setCurrentSlide(index)
    },
    [currentSlide]
  )

  const goToPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1)
      setCurrentSlide((s) => s - 1)
    }
  }, [currentSlide])

  const goToNext = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      setDirection(1)
      setCurrentSlide((s) => s + 1)
    }
  }, [currentSlide])

  const handleSlideClick = useCallback((index) => {
    setFullscreenSlide(SLIDES[index])
  }, [])

  const isConnecting = connectionState === 'connecting' || connectionState === 'reconnecting'

  return (
    <RoomContext.Provider value={room}>
      {/* Plays all remote audio tracks — this is what makes TTS audible */}
      <RoomAudioRenderer />

      {connectionState === 'connected' && (
        <AgentBridge onAgentState={handleAgentState} onTranscript={setTranscript} />
      )}

      <main className="min-h-[100dvh] bg-[#f9fafb] flex flex-col">
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

          {/* Header */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">VoiceDeck AI</h1>
              <p className="text-xs text-slate-400 mt-0.5">The Future of Agentic AI</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLogs((v) => !v)}
                title="Toggle log panel"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                  showLogs ? 'border-sky-400 text-sky-600 bg-sky-50' : 'border-slate-200 text-slate-400 hover:text-slate-600'
                }`}
              >
                <Terminal size={13} />
                Logs
              </button>
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  connectionState === 'connected' ? 'bg-emerald-400' : isConnecting ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'
                }`}
              />
              <span className="text-xs text-slate-400 capitalize">
                {connectionState === 'connected' ? 'Live' : isConnecting ? 'Connecting' : 'Offline'}
              </span>
            </div>
          </header>

          <AnimatePresence>
            {error && <ConnectionError message={error} onRetry={connect} />}
          </AnimatePresence>

          {/* Main content: sidebar + slide */}
          <div className="flex-1 flex gap-6">
            {/* Sidebar */}
            <SidebarNav currentSlide={currentSlide} onNavigate={handleSidebarNavigate} />

            {/* Right: slide + controls */}
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex-1 flex flex-col justify-center">
                <SlideDeck
                  slides={SLIDES}
                  currentSlide={currentSlide}
                  direction={direction}
                  onSlideClick={handleSlideClick}
                />
              </div>

              <div className="flex flex-col items-center gap-4">
                <SlideNav
                  currentSlide={currentSlide}
                  total={SLIDES.length}
                  onPrev={goToPrev}
                  onNext={goToNext}
                />
                <VoiceInterface
                  agentState={agentState}
                  transcript={transcript}
                  agentAudioTrack={agentAudioTrack}
                  micStream={micStream}
                  micEnabled={micEnabled}
                  onMicToggle={handleMicToggle}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <SlideFullscreen slide={fullscreenSlide} onClose={() => setFullscreenSlide(null)} />
      {showLogs && <LogPanel onClose={() => setShowLogs(false)} />}
    </RoomContext.Provider>
  )
}
