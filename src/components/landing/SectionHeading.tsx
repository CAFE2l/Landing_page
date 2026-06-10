"use client"

import { motion } from "framer-motion"
import { useIsMobile } from "../../hooks/useMobile"

interface SectionHeadingProps {
  label?: string
  title: string
  subtitle?: string
}

export default function SectionHeading({ label, title, subtitle }: SectionHeadingProps) {
  const isMobile = useIsMobile()

  return (
    <motion.div
      initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.4, ease: "easeOut" as const }}
      className="text-center mb-10 md:mb-16"
    >
      {label && (
        <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#0ea5e9] text-xs font-semibold tracking-wider uppercase mb-5">
          {label}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-zinc-500 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
          {subtitle}
        </p>
      )}
      <div className="h-px w-12 bg-zinc-800 mx-auto mt-8" />
    </motion.div>
  )
}
