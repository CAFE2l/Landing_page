"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface Orb {
  id: number
  color: string
  size: string
  initialX: number
  initialY: number
  driftX: number
  driftY: number
  duration: number
  delay: number
}

const orbs: Orb[] = [
  { id: 1, color: "bg-blue-500", size: "w-96 h-96", initialX: 10, initialY: 15, driftX: 40, driftY: -30, duration: 18, delay: 0 },
  { id: 2, color: "bg-cyan-500", size: "w-80 h-80", initialX: 70, initialY: 10, driftX: -30, driftY: 40, duration: 22, delay: 1 },
  { id: 3, color: "bg-blue-500", size: "w-72 h-72", initialX: 5, initialY: 60, driftX: 30, driftY: 20, duration: 20, delay: 0.5 },
  { id: 4, color: "bg-blue-500", size: "w-96 h-96", initialX: 75, initialY: 65, driftX: -40, driftY: -30, duration: 25, delay: 2 },
  { id: 5, color: "bg-cyan-400", size: "w-64 h-64", initialX: 40, initialY: 5, driftX: 20, driftY: 30, duration: 16, delay: 0.3 },
  { id: 6, color: "bg-blue-400", size: "w-80 h-80", initialX: 30, initialY: 70, driftX: -20, driftY: -40, duration: 19, delay: 1.5 },
]

export default function FloatingOrbs() {
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  )

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  if (reduceMotion) return null

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          initial={{
            x: `${orb.initialX}vw`,
            y: `${orb.initialY}vh`,
            opacity: 0,
            scale: 0.8,
          }}
          animate={{
            x: [`${orb.initialX}vw`, `${orb.initialX + orb.driftX}vw`, `${orb.initialX}vw`],
            y: [`${orb.initialY}vh`, `${orb.initialY + orb.driftY}vh`, `${orb.initialY}vh`],
            opacity: [0.06, 0.12, 0.06],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            delay: orb.delay,
            ease: "linear",
          }}
          className={`absolute -z-10 rounded-full blur-[120px] pointer-events-none ${orb.color} ${orb.size}`}
        />
      ))}
    </div>
  )
}
