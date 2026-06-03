"use client"

import { motion, useReducedMotion } from "framer-motion"
import SectionHeading from "./SectionHeading"

const steps = [
  {
    id: "01",
    name: "Discovery",
    lines: [
      "We discuss your project goals, target audience and requirements.",
      "I ask the right questions to understand exactly what you need.",
    ],
  },
  {
    id: "02",
    name: "Design",
    lines: [
      "Wireframes and visual design. I present the direction",
      "and iterate until it matches your vision.",
    ],
  },
  {
    id: "03",
    name: "Development",
    lines: [
      "Clean, modular code with regular updates.",
      "You get a staging link to follow progress in real time.",
    ],
  },
  {
    id: "04",
    name: "Delivery",
    lines: [
      "Testing, deployment, and handoff with",
      "documentation and post-launch support.",
    ],
  },
]

const stepVariants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { delay: i * 0.4, staggerChildren: 0.08 },
  }),
}

const lineVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
}

export default function Process() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="process" className="py-32 relative">
      <div className="container mx-auto px-6">
        <SectionHeading
          label="Process"
          title="How I Work"
          subtitle="A structured approach that keeps projects on track, on budget, and aligned with your goals."
        />

        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-[#0d0d0d] border-b border-white/[0.06]">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="text-xs font-mono text-zinc-600">
                caféservices ~ process
              </span>
              <div className="w-12" />
            </div>

            <div className="p-6 sm:p-8 font-mono text-sm leading-relaxed space-y-10">
              {steps.map((step, i) => (
                <motion.div
                  key={step.id}
                  custom={i}
                  initial={reduceMotion ? { opacity: 1 } : "hidden"}
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={!reduceMotion ? stepVariants : undefined}
                >
                  <motion.p
                    variants={lineVariants}
                    className="text-blue-400 font-semibold mb-2"
                  >
                    <span className="text-blue-500">$</span> ./step-{step.id}
                    <span className="text-zinc-500"> --name=</span>
                    <span className="text-amber-400/80">&quot;{step.name}&quot;</span>
                  </motion.p>

                  <div className="pl-5 border-l border-white/[0.06] space-y-1 mb-4">
                    {step.lines.map((line, j) => (
                      <motion.p
                        key={j}
                        variants={lineVariants}
                        className="text-zinc-400"
                      >
                        <span className="text-zinc-600">&gt;</span> {line}
                      </motion.p>
                    ))}
                  </div>

                  <motion.div
                    variants={lineVariants}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-1 h-3 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        initial={reduceMotion ? { width: "100%" } : { width: "0%" }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 1.2,
                          delay: i * 0.4 + 0.5,
                          ease: "easeOut",
                        }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      />
                    </div>
                    <motion.span
                      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        delay: i * 0.4 + 1.8,
                        duration: 0.3,
                      }}
                      className="text-[#28c840] font-semibold text-xs shrink-0"
                    >
                      done ✓
                    </motion.span>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
