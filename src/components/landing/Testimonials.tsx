"use client"

import { motion, useReducedMotion } from "framer-motion"
import SectionHeading from "./SectionHeading"
import { testimonials } from "../../data/testimonials"

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
  }),
}

export default function Testimonials() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <SectionHeading
          label="Testimonials"
          title="What Clients Say"
          subtitle="Feedback from people I've worked with across different projects and industries."
        />

        <div className="grid md:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              custom={i}
              initial={reduceMotion ? { opacity: 1 } : "hidden"}
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={!reduceMotion ? fadeUp : undefined}
              className="group relative rounded-2xl border border-white/[0.08] bg-[#0a1628] backdrop-blur-sm p-8 transition-all duration-300 border-t-2 border-t-blue-500/60 hover:shadow-[0_0_30px_rgba(37,99,235,0.12)]"
            >
                <span className="absolute top-4 left-5 text-6xl font-serif text-[#2563eb]/20 leading-none select-none">
                &ldquo;
              </span>

              <div className="flex gap-1 mb-5 relative">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <svg
                    key={j}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="#fbbf24"
                    stroke="#fbbf24"
                    strokeWidth="1"
                    style={{ filter: "drop-shadow(0 0 4px #fbbf24)" }}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>

              <blockquote className="text-sm text-zinc-400 leading-relaxed mb-6 relative">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 ring-2 ring-[#2563eb]/40 flex items-center justify-center text-xs font-semibold text-zinc-400">
                  {t.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">
                      {t.name}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 text-[#0ea5e9] text-[10px] font-medium border border-blue-500/20 leading-none">
                      Verified Client
                    </span>
                    <span className="text-sm">{t.flag}</span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {t.role}, {t.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
