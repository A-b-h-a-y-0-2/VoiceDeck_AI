import { motion } from 'motion/react'
import { Microphone, MicrophoneSlash } from '@phosphor-icons/react'
import { InputWaveform } from './InputWaveform.jsx'
import { OutputWaveform } from './OutputWaveform.jsx'
import { TranscriptPanel } from './TranscriptPanel.jsx'

const STATUS_LABELS = {
  IDLE: 'Ready',
  LISTENING: 'Listening...',
  PROCESSING: 'Thinking...',
  AI_PRESENTING: 'Speaking...',
  AI_RESPONDING: 'Speaking...',
}

export function VoiceInterface({ agentState, transcript, agentAudioTrack, micStream, micEnabled, onMicToggle }) {
  // Agent reports "listening" the moment it connects, before the user enables their mic.
  // Only show LISTENING in the UI when the mic is actually published.
  const effectiveState = (agentState === 'LISTENING' && !micEnabled) ? 'IDLE' : agentState

  const isListening = effectiveState === 'LISTENING'
  const isSpeaking = effectiveState === 'AI_PRESENTING' || effectiveState === 'AI_RESPONDING'
  const isProcessing = effectiveState === 'PROCESSING'
  const isActive = isListening || isSpeaking || isProcessing

  // Idle bars only when mic is off AND agent is truly idle
  const showIdleBars = !micEnabled && !isListening && !isSpeaking && !isProcessing

  return (
    <div className="flex flex-col items-center gap-5 pt-4 pb-2">
      {/* Status label */}
      <div className="flex items-center gap-2 h-5">
        {isActive && (
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"
          />
        )}
        <span className="text-sm font-medium text-slate-500 tracking-wide">
          {STATUS_LABELS[effectiveState] || 'Ready'}
        </span>
      </div>

      {/* Waveform area — only one visible at a time */}
      <div className="h-10 flex items-center justify-center">
        {/* Input waveform — shown when mic is on (regardless of agent state) */}
        {(isListening || micEnabled) && !isSpeaking && !isProcessing && (
          <InputWaveform active stream={micStream} />
        )}

        {/* Output waveform — shown when agent is speaking */}
        {isSpeaking && <OutputWaveform active trackRef={agentAudioTrack} />}

        {/* Processing bars */}
        {isProcessing && (
          <div className="flex gap-1 items-end h-10">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full bg-slate-300"
                animate={{ scaleY: [0.3, 1, 0.3] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12, type: 'spring', stiffness: 200, damping: 20 }}
                style={{ height: '100%', originY: 1 }}
              />
            ))}
          </div>
        )}

        {/* Idle placeholder bars — only when mic is off and truly idle */}
        {showIdleBars && (
          <div className="flex gap-1 items-center">
            {[0.3, 0.5, 0.8, 0.5, 0.3].map((h, i) => (
              <div key={i} className="w-1 rounded-full bg-slate-200" style={{ height: `${h * 40}px` }} />
            ))}
          </div>
        )}
      </div>

      {/* Mic toggle button */}
      <button
        onClick={onMicToggle}
        aria-label={micEnabled ? 'Mute mic' : 'Activate mic'}
        className={`relative w-14 h-14 flex items-center justify-center rounded-full transition-all ${
          micEnabled
            ? 'bg-[#2563EB] shadow-[0_0_0_6px_rgba(37,99,235,0.15)]'
            : 'bg-white border-2 border-slate-200 hover:border-[#2563EB]'
        }`}
      >
        {micEnabled && (
          <motion.span
            className="absolute inset-0 rounded-full bg-[#2563EB]"
            animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {micEnabled
          ? <Microphone size={22} weight="fill" className="text-white relative z-10" />
          : <MicrophoneSlash size={22} weight="regular" className="text-slate-400 relative z-10" />
        }
      </button>

      {/* Transcript */}
      <TranscriptPanel text={transcript} visible={isSpeaking && Boolean(transcript)} />
    </div>
  )
}
