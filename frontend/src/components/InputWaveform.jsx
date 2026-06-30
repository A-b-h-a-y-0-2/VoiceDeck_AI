import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'

const BAR_COUNT = 5
const FREQ_BANDS = [60, 150, 400, 1000, 2500]

export function InputWaveform({ active, stream }) {
  const barsRef = useRef([])
  const rafRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const audioCtxRef = useRef(null)

  useEffect(() => {
    if (!active || !stream) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      barsRef.current.forEach((el) => {
        if (el) el.style.transform = 'scaleY(0.15)'
      })
      return
    }

    const audioCtx = new AudioContext()
    audioCtxRef.current = audioCtx
    const source = audioCtx.createMediaStreamSource(stream)
    sourceRef.current = source
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    analyserRef.current = analyser
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const nyquist = audioCtx.sampleRate / 2
    const binSize = nyquist / analyser.frequencyBinCount

    const draw = () => {
      analyser.getByteFrequencyData(dataArray)
      FREQ_BANDS.forEach((freq, i) => {
        const bin = Math.round(freq / binSize)
        const value = dataArray[Math.min(bin, dataArray.length - 1)] / 255
        const scale = Math.max(0.1, value)
        if (barsRef.current[i]) {
          barsRef.current[i].style.transform = `scaleY(${scale})`
        }
      })
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      source.disconnect()
      analyser.disconnect()
      audioCtx.close()
    }
  }, [active, stream])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex items-center justify-center gap-1 h-10"
          aria-hidden="true"
        >
          {Array.from({ length: BAR_COUNT }).map((_, i) => (
            <div
              key={i}
              ref={(el) => (barsRef.current[i] = el)}
              className="w-1 rounded-full bg-[#2563EB] origin-center"
              style={{
                height: '100%',
                transform: 'scaleY(0.15)',
                transition: 'transform 60ms ease-out',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
