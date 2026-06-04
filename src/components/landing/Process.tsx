"use client"

import { useState, useEffect } from "react"
import { motion, useReducedMotion } from "framer-motion"
import SectionHeading from "./SectionHeading"

interface StepData {
  id: string
  command: string
  lines: string[]
}

const steps: StepData[] = [
  {
    id: "01",
    command: './run --step="Discovery"',
    lines: [
      "We discuss your project goals, target audience and requirements.",
      "I ask the right questions before writing a single line of code.",
    ],
  },
  {
    id: "02",
    command: './run --step="Design"',
    lines: [
      "Wireframes and visual design presented for your approval.",
      "We iterate until it matches your vision perfectly.",
    ],
  },
  {
    id: "03",
    command: './run --step="Development"',
    lines: [
      "Clean, modular code with regular progress updates.",
      "You get a staging environment to review before launch.",
    ],
  },
  {
    id: "04",
    command: './run --step="Delivery"',
    lines: [
      "Testing, deployment and full handoff with documentation.",
      "Post-launch support included for 30 days.",
    ],
  },
]

function StepProgress({ index }: { index: number }) {
  const [start, setStart] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setStart(true), 600 + index * 300)
    return () => clearTimeout(t)
  }, [index])

  return (
    <div className="flex items-center gap-3 mt-3">
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: "0%" }}
          animate={start ? { width: "100%" } : undefined}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#0ea5e9]"
        />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={start ? { opacity: 1 } : undefined}
        transition={{ delay: 1.2, duration: 0.3 }}
        className="text-[#22c55e] font-semibold text-xs shrink-0"
      >
        100% ✓
      </motion.span>
    </div>
  )
}

export default function Process() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="process" className="py-20 md:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <SectionHeading
          label="Process"
          title="How I Work"
          subtitle="A structured approach that keeps projects on track, on budget, and aligned with your goals."
        />

        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-[#1a2d4a] bg-[#060d10] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between px-5 py-3 bg-[#0a1628] border-b border-[#1a2d4a]">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
              </div>
              <span className="text-xs font-mono text-white/40">
                cafestore ~ process
              </span>
              <div className="w-12" />
            </div>

            <div className="p-4 sm:p-6 font-mono text-sm leading-relaxed space-y-6 md:space-y-8">
              {steps.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: i * 0.3, duration: 0.4 }}
                >
                  <p className="text-white font-semibold mb-2">
                    <span className="text-[#3b82f6]">$</span> {step.command}
                  </p>

                  <div className="pl-5 border-l border-[#1a2d4a] space-y-1 mb-2">
                    {step.lines.map((line, j) => (
                      <motion.p
                        key={j}
                        initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.3 + 0.2 + j * 0.1, duration: 0.3 }}
                        className="text-[#94a3b8]"
                      >
                        <span className="text-zinc-600 mr-2">&rarr;</span>
                        {line}
                      </motion.p>
                    ))}
                  </div>

                  {reduceMotion ? (
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#0ea5e9] w-full" />
                      </div>
                      <span className="text-[#22c55e] font-semibold text-xs shrink-0">
                        100% ✓
                      </span>
                    </div>
                  ) : (
                    <StepProgress index={i} />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
