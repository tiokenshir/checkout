import { motion, AnimatePresence } from 'framer-motion'
import { Box } from '@chakra-ui/react'

type TransitionProps = {
  children: React.ReactNode
  type?: 'fade' | 'slide' | 'scale'
  direction?: 'left' | 'right' | 'up' | 'down'
  duration?: number
  delay?: number
}

const variants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  slide: {
    left: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    },
    right: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
    },
    up: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    down: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
  },
}

export function Transition({
  children,
  type = 'fade',
  direction = 'right',
  duration = 0.2,
  delay = 0,
}: TransitionProps) {
  const getVariants = () => {
    if (type === 'slide') {
      return variants.slide[direction]
    }
    return variants[type]
  }

  return (
    <AnimatePresence mode="wait">
      <Box
        as={motion.div}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={getVariants()}
        transition={{
          duration,
          delay,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {children}
      </Box>
    </AnimatePresence>
  )
}