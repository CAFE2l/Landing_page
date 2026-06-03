"use client"

import { motion, useReducedMotion } from "framer-motion"
import SectionHeading from "./SectionHeading"

const projects = [
  {
    name: "FinFlow Dashboard",
    tags: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind"],
    gradient: "from-blue-600/20 via-cyan-600/10 to-transparent",
    desc: "Real-time financial analytics platform with interactive charts and multi-currency support.",
  },
  {
    name: "GreenMarket",
    tags: ["React", "Node.js", "Prisma", "Stripe"],
    gradient: "from-emerald-600/20 via-teal-600/10 to-transparent",
    desc: "E-commerce marketplace for sustainable products with payment processing and inventory management.",
  },
  {
    name: "DevPort",
    tags: ["Next.js", "Framer Motion", "MDX", "Vercel"],
    gradient: "from-orange-500/15 via-amber-500/10 to-transparent",
    desc: "Portfolio platform for developers with drag-and-drop sections and live preview.",
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: "easeOut" as const },
  }),
}

export default function FeaturedWork() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="work" className="py-32 relative">
      <div className="container mx-auto px-6">
        <SectionHeading
          label="Portfolio"
          title="Featured Work"
          subtitle="A selection of projects I've built. Each one reflects my commitment to quality, performance, and clean design."
        />

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {projects.map((project, i) => (
            <motion.div
              key={project.name}
              custom={i}
              initial={reduceMotion ? { opacity: 1 } : "hidden"}
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={!reduceMotion ? fadeUp : undefined}
              whileHover={!reduceMotion ? { y: -6, transition: { duration: 0.2 } } : undefined}
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden transition-all duration-300 hover:border-blue-500/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]"
            >
              <div className={`relative h-52 bg-gradient-to-br ${project.gradient} flex items-center justify-center overflow-hidden`}>
                <div className="absolute inset-0 bg-dot-grid opacity-50" />
                <div className="relative z-10 text-6xl font-bold text-white/10 select-none">
                  {project.name.charAt(0)}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-500 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {project.name}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-4">
                  {project.desc}
                </p>
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 group-hover:text-blue-400 transition-colors duration-200"
                >
                  View case
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
