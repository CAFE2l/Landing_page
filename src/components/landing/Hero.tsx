"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useReducedMotion } from "framer-motion"

const titleLine1 = "I Build Digital Products"
const titleLine2 = "That Win Clients"

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: "easeOut" as const },
  },
})

const staggerWords = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.4 },
  },
}

const wordReveal = {
  hidden: { opacity: 0, y: 60, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
}

function AnimatedNumber({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          let current = 0
          const increment = Math.ceil(end / 40)
          const interval = setInterval(() => {
            current += increment
            if (current >= end) {
              setCount(end)
              clearInterval(interval)
            } else {
              setCount(current)
            }
          }, 30)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [end])

  return <span ref={ref}>{count}{suffix}</span>
}

export default function Hero() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-32 pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid" />

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2563eb] rounded-full pointer-events-none"
        style={{ filter: "blur(150px)" }}
        animate={
          !reduceMotion
            ? { scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }
            : undefined
        }
        transition={{
          repeat: Infinity,
          duration: 6,
          ease: "easeInOut",
        }}
      />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full glass mb-10"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 animate-ping opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-zinc-400 text-sm font-medium">
            Available for new projects
          </span>
        </motion.div>

        <motion.h1
          className="max-w-5xl mx-auto mb-8"
          variants={!reduceMotion ? staggerWords : undefined}
          initial="hidden"
          animate="visible"
        >
          <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-[1.05] tracking-tight">
            {titleLine1.split(" ").map((word, i) => (
              <motion.span
                key={`l1-${i}`}
                variants={!reduceMotion ? wordReveal : undefined}
                className="inline-block mr-[0.3em]"
              >
                {word}
              </motion.span>
            ))}
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#60a5fa] via-[#38bdf8] to-[#2563eb]">
              {titleLine2.split(" ").map((word, i) => (
                <motion.span
                  key={`l2-${i}`}
                  variants={!reduceMotion ? wordReveal : undefined}
                  className="inline-block mr-[0.3em]"
                >
                  {word}
                </motion.span>
              ))}
            </span>
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.6)}
          className="text-base sm:text-lg text-zinc-500 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          High-quality web development with clean code, pixel-perfect design, and
          clear communication. From landing pages to full-stack applications.
        </motion.p>

        <motion.div
          {...fadeUp(0.75)}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <motion.a
            href="#contact"
            whileHover={!reduceMotion ? { scale: 1.04 } : undefined}
            whileTap={!reduceMotion ? { scale: 0.97 } : undefined}
            className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-8 py-3.5 rounded-xl text-sm font-semibold border border-[#3b82f6]/40 shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-300"
          >
            Start a Project
          </motion.a>
          <motion.a
            href="#work"
            whileHover={!reduceMotion ? { scale: 1.04 } : undefined}
            whileTap={!reduceMotion ? { scale: 0.97 } : undefined}
            className="glass glass-hover text-zinc-300 px-8 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200"
          >
            View My Work
          </motion.a>
        </motion.div>

        <motion.div
          {...fadeUp(0.9)}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-zinc-600"
        >
          <span className="flex items-center gap-1.5">
            <span className="text-[#3b82f6] font-semibold">
              <AnimatedNumber end={20} suffix="+" />
            </span>
            Clients
          </span>
          <span className="w-1 h-1 rounded-full bg-zinc-700 hidden sm:block" />
          <span className="flex items-center gap-1.5">
            <span className="text-[#3b82f6] font-semibold">
              <AnimatedNumber end={50} suffix="+" />
            </span>
            Projects delivered
          </span>
          <span className="w-1 h-1 rounded-full bg-zinc-700 hidden sm:block" />
          <span className="flex items-center gap-1.5">
            <span className="text-[#3b82f6] font-semibold">
              <AnimatedNumber end={12} suffix="+" />
            </span>
            Countries
          </span>
        </motion.div>

        <motion.div
          {...fadeUp(1.05)}
          className="flex flex-col items-center gap-2 mt-20"
        >
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-zinc-600"
            animate={!reduceMotion ? { y: [0, 8, 0] } : undefined}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </motion.svg>
          <span className="text-xs text-zinc-700 font-mono tracking-wider">
            scroll to explore
          </span>
        </motion.div>
      </div>
    </section>
  )
}
