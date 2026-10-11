import { createContext, useCallback, useContext, useMemo } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useMousePosition } from '../../hooks/useMousePosition.js'
import { useReducedMotion } from '../../hooks/useReducedMotion.js'

export const CursorContext = createContext(null)

export function CursorProvider({ children }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const smoothX = useSpring(x, { stiffness: 90, damping: 24, mass: 0.35 })
  const smoothY = useSpring(y, { stiffness: 90, damping: 24, mass: 0.35 })
  const reduced = useReducedMotion()
  const updatePointer = useCallback((nextX, nextY) => {
    x.set(nextX)
    y.set(nextY)
  }, [x, y])
  useMousePosition(updatePointer, reduced)

  const value = useMemo(() => ({ smoothX, smoothY, reduced }), [smoothX, smoothY, reduced])
  return <CursorContext.Provider value={value}>{children}</CursorContext.Provider>
}

export function GlobalCursorGlow() {
  const { reduced, smoothX, smoothY } = useContext(CursorContext)
  const gridX = useTransform(smoothX, [-1, 1], [10, -10])
  const gridY = useTransform(smoothY, [-1, 1], [8, -8])
  return (
    <>
      <div className={`global-glow${reduced ? ' motion-reduced' : ''}`} aria-hidden="true" />
      {!reduced && <motion.div className="global-parallax" style={{ x: gridX, y: gridY }} aria-hidden="true" />}
    </>
  )
}

export function Interactive3D({ children, className = '', intensity = 4, as: Component = 'div', style = {}, ...props }) {
  const context = useContext(CursorContext)
  const reduced = context?.reduced
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springX = useSpring(rotateX, { stiffness: 180, damping: 22 })
  const springY = useSpring(rotateY, { stiffness: 180, damping: 22 })
  const lightX = useTransform(springY, [-intensity, intensity], ['25%', '75%'])

  function onPointerMove(event) {
    if (reduced || event.pointerType === 'touch' || window.matchMedia('(pointer: coarse)').matches) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    rotateX.set(-y * intensity)
    rotateY.set(x * intensity)
  }

  function reset() {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      className={`interactive-3d ${className}`}
      style={{
        ...style,
        rotateX: springX,
        rotateY: springY,
        transformPerspective: 1100,
        '--light-x': lightX,
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      {...props}
    >
      {children}
    </motion.div>
  )
}
