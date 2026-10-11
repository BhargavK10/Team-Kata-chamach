import { useEffect, useRef } from 'react'

export function useMousePosition(onMove, disabled = false) {
  const positionRef = useRef({ x: -1000, y: -1000 })

  useEffect(() => {
    if (disabled || window.matchMedia('(pointer: coarse)').matches) return undefined
    const update = (event) => {
      positionRef.current = { x: event.clientX, y: event.clientY }
      document.documentElement.style.setProperty('--cursor-x', `${event.clientX}px`)
      document.documentElement.style.setProperty('--cursor-y', `${event.clientY}px`)
      onMove?.(event.clientX / window.innerWidth * 2 - 1, event.clientY / window.innerHeight * 2 - 1)
    }
    window.addEventListener('pointermove', update, { passive: true })
    return () => window.removeEventListener('pointermove', update)
  }, [disabled, onMove])

  return positionRef
}
