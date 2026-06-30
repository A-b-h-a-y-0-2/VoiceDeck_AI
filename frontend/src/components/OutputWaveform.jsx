import { AnimatePresence, motion } from 'motion/react'
import { BarVisualizer } from '@livekit/components-react'

export function OutputWaveform({ active, trackRef }) {
  return (
    <AnimatePresence>
      {active && trackRef && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex items-center justify-center h-10 w-20"
          aria-hidden="true"
        >
          <BarVisualizer
            trackRef={trackRef}
            barCount={5}
            style={{ width: '100%', height: '100%' }}
            options={{ minHeight: 3 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
