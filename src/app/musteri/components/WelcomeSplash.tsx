'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'

interface WelcomeSplashProps {
  name: string
  onComplete: () => void
}

export default function WelcomeSplash({ name, onComplete }: WelcomeSplashProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete()
    }, 2500)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#f59e0b] flex items-center justify-center z-[100]"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center"
      >
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-[48px] font-bold text-white mb-4"
          style={{ fontFamily: 'Open Sans, sans-serif' }}
        >
          Hoş geldiniz,
        </motion.h1>
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-[36px] font-bold text-white"
          style={{ fontFamily: 'Open Sans, sans-serif' }}
        >
          {name}
        </motion.h2>
      </motion.div>
    </motion.div>
  )
}
