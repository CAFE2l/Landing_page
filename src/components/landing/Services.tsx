"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Layout, Globe, Code2, Smartphone } from "lucide-react"
import SectionHeading from "./SectionHeading"

const services = [
  {
    icon: Layout,
    title: "Landing Pages",
    desc: "High-converting, responsive landing pages built for performance. Perfect for campaigns, products, and startups.",
    image: "/imgs/Plans/Produtos.png",
  },
  {
    icon: Globe,
    title: "Professional Website",
    desc: "Multi-page websites with CMS, SEO, analytics, and a structure that scales with your business.",
    image: "/imgs/Plans/portfolio.png",
  },
  {
    icon: Code2,
    title: "Web Applications",
    desc: "Full-stack apps with authentication, databases, APIs, and real-time features using modern frameworks.",
    image: "/imgs/Plans/Banner_Samptech.jpeg",
  },
  {
    icon: Smartphone,
    title: "SaaS & Dashboards",
    desc: "Scalable software platforms with admin panels, user management, and data visualization.",
    image: "/imgs/Plans/banner.png",
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
    <section id="services" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-6">
        <SectionHeading
          label="Services"
          title="What I Build"
          subtitle="From landing pages to full-scale platforms — each project is crafted with attention to detail and modern best practices."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              custom={i}
              initial={reduceMotion ? { opacity: 1 } : "hidden"}
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={!reduceMotion ? fadeUp : undefined}
              whileHover={!reduceMotion ? { y: -8, transition: { duration: 0.25 } } : undefined}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm transition-all duration-400 hover:bg-white/[0.06] hover:border-blue-500/25 hover:shadow-[0_0_40px_rgba(37,99,235,0.12)]"
            >
              <div className="relative overflow-hidden rounded-t-2xl bg-[#060d14]">
                <div className="aspect-[16/10]">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/95 via-[#0a1628]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06] group-hover:ring-blue-500/20 rounded-t-2xl transition-all duration-400" />
              </div>

              <div className="p-5 sm:p-6">
                <div className="w-11 h-11 rounded-xl bg-[#0a1628] border border-white/[0.08] flex items-center justify-center mb-4 group-hover:border-blue-500/25 group-hover:bg-blue-500/10 transition-all duration-300 shadow-lg">
                  <service.icon className="text-zinc-400 group-hover:text-[#0ea5e9] transition-colors duration-300" size={20} />
                </div>

                <h3 className="text-base font-semibold text-white mb-2.5">
                  {service.title}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-4">
                  {service.desc}
                </p>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 group-hover:text-[#0ea5e9] transition-colors duration-200"
                >
                  Learn more
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
