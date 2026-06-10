"use client"

import { motion } from "framer-motion"
import { useIsMobile } from "../../hooks/useMobile"

const desktopOrbConfig = [
  { size: 620, color: "#1d4ed8", left: "-10%", top: "8%", delay: 0 },
  { size: 520, color: "#0ea5e9", left: "62%", top: "-12%", delay: 1.2 },
  { size: 700, color: "#6366f1", left: "58%", top: "52%", delay: 2.1 },
  { size: 440, color: "#1d4ed8", left: "12%", top: "62%", delay: 0.6 },
]

const mobileOrbConfig = [
  { size: 300, color: "#1d4ed8", left: "10%", top: "10%", delay: 0 },
  { size: 350, color: "#6366f1", left: "50%", top: "50%", delay: 1 },
]

const desktopParticles = Array.from({ length: 28 }, (_, index) => ({
  left: `${(index * 37 + 11) % 100}%`,
  top: `${(index * 53 + 17) % 100}%`,
  size: 2 + (index % 3),
  duration: 6 + (index % 9),
  delay: (index % 7) * 0.35,
  opacity: 0.2 + (index % 4) * 0.08,
}))

export default function TechPremiumBackground() {
  const isMobile = useIsMobile()
  const orbConfig = isMobile ? mobileOrbConfig : desktopOrbConfig
  const particles = isMobile ? [] : desktopParticles
  const blurPx = isMobile ? 60 : 120

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#020408]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.18),transparent_40%),radial-gradient(circle_at_75%_65%,rgba(14,165,233,0.12),transparent_35%)]" />
      <div className="absolute inset-x-[-20%] bottom-[-20%] h-[75vh] origin-bottom auth-perspective-grid opacity-70" />

      {orbConfig.map((orb) => (
        <motion.div
          key={`${orb.color}-${orb.left}-${orb.top}`}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.left,
            top: orb.top,
            backgroundColor: orb.color,
            filter: `blur(${blurPx}px)`,
          }}
          animate={isMobile ? undefined : {
            x: [0, 30, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.95, 1],
            opacity: [0.06, 0.14, 0.08, 0.06],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}

      {particles.map((particle, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full bg-[#3b82f6]"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
          }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: particle.delay,
          }}
        />
      ))}

      <motion.div
        className="absolute left-0 h-px w-full bg-gradient-to-r from-transparent via-[#3b82f6]/40 to-transparent"
        animate={isMobile ? undefined : { top: ["-2%", "102%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,4,8,0.1),rgba(2,4,8,0.65))]" />
    </div>
  )
}
