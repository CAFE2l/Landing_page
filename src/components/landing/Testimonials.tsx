"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Link } from "react-router-dom"
import { MessageSquareText } from "lucide-react"
import { useIsMobile } from "../../hooks/useMobile"
import SectionHeading from "./SectionHeading"
import type { FeedbackEntry } from "../../data/feedbackStore"

interface TestimonialsProps {
  feedbacks: FeedbackEntry[]
}

export default function Testimonials({ feedbacks }: TestimonialsProps) {
  const reduceMotion = useReducedMotion()
  const isMobile = useIsMobile()
  const approved = feedbacks.filter((item) => item.approved).slice(0, 3)

  return (
    <section className="py-20 md:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <SectionHeading
          label="Testimonials"
          title="What Clients Say"
          subtitle="Verified feedback from clients, including project context, media, and measurable results."
        />

        {approved.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {approved.map((item) => (
              <article key={item.id} className="rounded-2xl border border-white/[0.08] bg-[#0a1628] p-5 md:p-7">
                <p className="text-sm text-zinc-400 leading-relaxed mb-5">&ldquo;{item.quote}&rdquo;</p>
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="text-xs text-zinc-600">{item.role}, {item.company}</p>
              </article>
            ))}
          </div>
        ) : (
          <motion.div
            initial={reduceMotion || isMobile ? { opacity: 1 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            className="mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 md:p-8 text-center"
          >
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[#3b82f6]/25 bg-[#2563eb]/10 text-[#60a5fa]">
              <MessageSquareText size={22} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-white">No client feedback yet</h3>
            <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-zinc-500">
              This area will be filled from the backend after clients publish approved feedback.
            </p>
            <Link to="/feedback" className="touch-target inline-flex items-center justify-center rounded-xl border border-[#3b82f6]/40 bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#1d4ed8]">
              Go to Feedbacks
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  )
}
