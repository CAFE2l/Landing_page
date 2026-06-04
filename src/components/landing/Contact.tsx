"use client"

import { motion, useReducedMotion } from "framer-motion"
import WhatsAppIcon from "./WhatsAppIcon"

export default function Contact() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="contact" className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#2563eb]/[0.03] via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Support and community beyond delivery
          </h2>
          <p className="text-zinc-500 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            CAFÉ STORE doesn&apos;t just deliver files. You can also be part of a community to evolve your projects and, upon becoming a client, receive access to an exclusive VIP space.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-32">
          {/* Discord Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-[#5865F2]/10 flex items-center justify-center mb-6">
              <img src="/imgs/icons/Discord.png" alt="Discord" className="w-6 h-6 object-contain" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Discord Community</h3>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8">
              An open space to exchange ideas, ask questions, follow the behind-the-scenes and connect with people who are also creating digital projects.
            </p>
            <a
              href="#"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/5 transition-colors mb-4"
            >
              <img src="/imgs/icons/Discord.png" alt="" className="w-4 h-4 opacity-70" />
              Join Discord
            </a>
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Open to everyone interested</span>
          </motion.div>

          {/* Telegram Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300"
          >
            <div className="absolute top-8 right-8 px-2 py-1 rounded-md bg-[#2563eb]/10 border border-[#2563eb]/20">
              <span className="text-[9px] text-[#2563eb] font-bold uppercase tracking-wider">Exclusive for clients</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#0088cc]/10 flex items-center justify-center mb-6">
              <img src="/imgs/icons/Telegram.png" alt="Telegram" className="w-6 h-6 object-contain" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">VIP Telegram</h3>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8">
              Exclusive area for clients who have already completed their services. Receive support, news, exclusive content and post-delivery follow-up.
            </p>
            <a
              href="#"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold border border-[#3b82f6]/40 shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all mb-4"
            >
              <img src="/imgs/icons/Telegram.png" alt="" className="w-4 h-4 opacity-70" />
              Request VIP access
            </a>
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Access released after project completion</span>
          </motion.div>
        </div>

        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight">
            Still have questions?
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed mb-10 max-w-md mx-auto">
            Talk to me on WhatsApp and we can align everything in 15 minutes.
          </p>

          <motion.a
            href="https://wa.me/5541996713782"
            whileHover={!reduceMotion ? { scale: 1.04 } : undefined}
            whileTap={!reduceMotion ? { scale: 0.97 } : undefined}
            className="inline-flex items-center gap-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-10 py-4 rounded-xl text-base font-semibold border border-[#3b82f6]/40 shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-300"
          >
            <WhatsAppIcon className="w-5 h-5" />
            Talk to me
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
