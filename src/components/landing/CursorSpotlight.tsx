"use client"

import { useEffect, useState, useCallback } from "react"
import { shouldDisableMouseEffects } from "../../lib/performance"

export default function CursorSpotlight() {
  const [pos, setPos] = useState({ x: -999, y: -999 })

  const handleMouse = useCallback((e: MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    if (shouldDisableMouseEffects()) return
    window.addEventListener("mousemove", handleMouse, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouse)
  }, [handleMouse])

  if (shouldDisableMouseEffects()) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(37,99,235,0.06), transparent 40%)`,
      }}
    />
  )
}
