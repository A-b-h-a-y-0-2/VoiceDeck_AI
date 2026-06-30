import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'

export function TranscriptPanel({ text, visible }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [text])

  return (
    <AnimatePresence>
      {visible && text && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-xl mx-auto"
        >
          <div
            ref={scrollRef}
            className="bg-white border border-slate-200/50 rounded-2xl px-6 py-4 max-h-28 overflow-y-auto shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)]"
          >
            <p className="text-slate-700 text-sm leading-relaxed">{text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
