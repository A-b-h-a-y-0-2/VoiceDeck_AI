import { motion } from 'motion/react'

export function SlideCard({ slide, onClick }) {
  return (
    <motion.div
      layoutId={`slide-${slide.index}`}
      onClick={onClick}
      className="cursor-pointer rounded-[2rem] bg-white border border-slate-200/50 p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] select-none"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="mb-6">
        <span className="text-xs font-medium tracking-widest text-slate-400 uppercase">
          Slide {slide.index + 1} of 6
        </span>
      </div>
      <h2 className="text-3xl font-semibold tracking-tight text-slate-900 leading-tight mb-3">
        {slide.title}
      </h2>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">{slide.summary}</p>
      <ul className="space-y-2">
        {slide.bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2 text-slate-600 text-base leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#2563EB] flex-shrink-0" />
            {bullet}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
