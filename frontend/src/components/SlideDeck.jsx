import { AnimatePresence, motion } from 'motion/react'
import { SlideCard } from './SlideCard.jsx'

const variants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
}

export function SlideDeck({ slides, currentSlide, direction, onSlideClick }) {
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={currentSlide}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <SlideCard
            slide={slides[currentSlide]}
            onClick={() => onSlideClick(currentSlide)}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
