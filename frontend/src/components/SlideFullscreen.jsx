import { AnimatePresence, motion } from 'motion/react'
import { X } from '@phosphor-icons/react'

export function SlideFullscreen({ slide, onClose }) {
  return (
    <AnimatePresence>
      {slide && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key={`slide-fullscreen-${slide.index}`}
            layoutId={`slide-${slide.index}`}
            className="fixed inset-6 z-50 bg-white rounded-[2rem] p-12 md:p-16 flex flex-col justify-center shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] overflow-auto"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <button
              onClick={onClose}
              aria-label="Close fullscreen"
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X size={18} weight="bold" />
            </button>

            <span className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-6">
              Slide {slide.index + 1} of 6
            </span>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tighter text-slate-900 leading-none mb-4">
              {slide.title}
            </h1>
            <p className="text-slate-500 text-lg mb-10 leading-relaxed">{slide.summary}</p>
            <ul className="space-y-4">
              {slide.bullets.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-xl text-slate-600 leading-relaxed"
                >
                  <span className="mt-2.5 w-2 h-2 rounded-full bg-[#2563EB] flex-shrink-0" />
                  {bullet}
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
