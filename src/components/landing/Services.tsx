"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Layout, Globe, Code2, Smartphone } from "lucide-react"
import SectionHeading from "./SectionHeading"

const services = [
  {
    icon: Layout,
    title: "Landing Pages",
    desc: "High-converting, responsive landing pages built for performance. Perfect for campaigns, products, and startups.",
  },
  {
    icon: Globe,
    title: "Websites & Portals",
    desc: "Multi-page websites with CMS, SEO, analytics, and a structure that scales with your business.",
  },
  {
    icon: Code2,
    title: "Web Applications",
    desc: "Full-stack apps with authentication, databases, APIs, and real-time features using modern frameworks.",
  },
  {
    icon: Smartphone,
    title: "SaaS & Dashboards",
    desc: "Scalable software platforms with admin panels, user management, and data visualization.",
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
  }),
}

export default function Services() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="services" className="py-32 relative">
      <div className="container mx-auto px-6">
        <SectionHeading
          label="Services"
          title="What I Build"
          subtitle="From landing pages to full-scale platforms — each project is crafted with attention to detail and modern best practices."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              custom={i}
              initial={reduceMotion ? { opacity: 1 } : "hidden"}
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={!reduceMotion ? fadeUp : undefined}
              whileHover={!reduceMotion ? { y: -6, transition: { duration: 0.2 } } : undefined}
              className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-500/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]"
            >
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-5 group-hover:border-blue-500/20 group-hover:bg-blue-500/5 transition-all duration-300">
                <service.icon className="text-zinc-400 group-hover:text-blue-400 transition-colors duration-300" size={22} />
              </div>

              <h3 className="text-lg font-semibold text-white mb-3">
                {service.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed mb-5">
                {service.desc}
              </p>
              <a
                href="#contact"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 group-hover:text-blue-400 transition-colors duration-200"
              >
                Learn more
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
