import { useRef, useState, useCallback, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PageFlipProps {
  children: ReactNode[]
  currentPage: number
  onPageChange: (page: number) => void
  mode: 'scroll' | 'slide' | 'simulation'
}

export default function PageFlip({
  children,
  currentPage,
  onPageChange,
  mode
}: PageFlipProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [direction, setDirection] = useState(0)

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50
      if (info.offset.x > threshold && currentPage > 0) {
        setDirection(-1)
        onPageChange(currentPage - 1)
      } else if (info.offset.x < -threshold && currentPage < children.length - 1) {
        setDirection(1)
        onPageChange(currentPage + 1)
      }
    },
    [currentPage, children.length, onPageChange]
  )

  const handlePrev = useCallback(() => {
    if (currentPage > 0) {
      setDirection(-1)
      onPageChange(currentPage - 1)
    }
  }, [currentPage, onPageChange])

  const handleNext = useCallback(() => {
    if (currentPage < children.length - 1) {
      setDirection(1)
      onPageChange(currentPage + 1)
    }
  }, [currentPage, children.length, onPageChange])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrev, handleNext])

  if (mode === 'scroll') {
    return (
      <div ref={containerRef} className="h-full overflow-y-auto">
        {children}
      </div>
    )
  }

  const pageVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      rotateY: direction > 0 ? -15 : 15
    }),
    center: {
      x: 0,
      opacity: 1,
      rotateY: 0
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
      rotateY: direction > 0 ? 15 : -15
    })
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0
    })
  }

  const variants = mode === 'simulation' ? pageVariants : slideVariants

  return (
    <div ref={containerRef} className="relative h-full overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentPage}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className={`absolute inset-0 ${
            mode === 'simulation' ? 'page-flip-container' : ''
          }`}
        >
          <div
            className={`h-full overflow-y-auto custom-scrollbar p-8 ${
              mode === 'simulation' ? 'page-flip shadow-xl' : ''
            }`}
          >
            {children[currentPage]}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="absolute inset-y-0 left-0 flex items-center p-2 z-10">
        <button
          onClick={handlePrev}
          disabled={currentPage === 0}
          className={`p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md transition-all ${
            currentPage === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center p-2 z-10">
        <button
          onClick={handleNext}
          disabled={currentPage === children.length - 1}
          className={`p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md transition-all ${
            currentPage === children.length - 1
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:scale-110'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Page indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-sm shadow-sm">
        {currentPage + 1} / {children.length}
      </div>
    </div>
  )
}