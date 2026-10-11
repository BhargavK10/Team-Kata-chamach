import { motion, useTransform } from 'framer-motion'
import { useContext } from 'react'
import { CursorContext } from './CursorEffects.jsx'

export default function ParallaxGrid({ className = '' }) {
  const context = useContext(CursorContext)
  const x = useTransform(context.smoothX, [-1, 1], [13, -13])
  const y = useTransform(context.smoothY, [-1, 1], [10, -10])
  return <motion.div className={`parallax-grid ${className}`} style={{ x, y }} aria-hidden="true" />
}
