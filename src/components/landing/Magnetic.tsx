"use client"

import { useRef, useState, useCallback, type ReactNode } from "react"
import { motion } from "framer-motion"
import { useIsMobile } from "../../hooks/useMobile"

interface MagneticProps {
  children: ReactNode
  strength?: number
  className?: string
}

export default function Magnetic({ children, strength = 0.15, className }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const isMobile = useIsMobile()

  const handleMouse = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile) return
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return
      const x = (e.clientX - rect.left - rect.width / 2) * strength
      const y = (e.clientY - rect.top - rect.height / 2) * strength
      setPos({ x, y })
    },
    [strength, isMobile]
  )

  const handleLeave = useCallback(() => {
    setPos({ x: 0, y: 0 })
  }, [])

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      animate={isMobile ? undefined : { x: pos.x, y: pos.y }}
      whileTap={{ scale: 0.97 }}
      transition={isMobile ? undefined : { type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
