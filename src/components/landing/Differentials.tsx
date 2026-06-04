"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Palette, Zap, Code, LifeBuoy, Search } from "lucide-react"
import SectionHeading from "./SectionHeading"

const items = [
  {
    icon: Palette,
    title: "Pixel Perfect",
    desc: "Every detail is aligned, spaced, and polished. Designs look as good in code as they did in Figma.",
  },
  {
    icon: Zap,
    title: "Fast Delivery",
    desc: "Clear timelines with regular updates. I ship fast without cutting corners on quality.",
  },
  {
    icon: Code,
    title: "Clean Code",
    desc: "Modular, typed, and documented codebases. Easy to maintain, scale, or hand off.",
  },
  {
    imgSrc: "/imgs/icons/Google_Translate.png",
    title: "Bilingual",
    desc: "Fluent in English and Portuguese. Clear communication across time zones and cultures.",
  },
  {
    icon: LifeBuoy,
    title: "Post-launch Support",
    desc: "I don't disappear after launch. Training, documentation, and ongoing support included.",
  },
  {
    icon: Search,
    title: "SEO Ready",
    desc: "Every site is built with semantic HTML, fast load times, and structured data from day one.",
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: "easeOut" as const },
  }),
}

export default function Differentials() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="py-20 md:py-32 relative">
      <div className="container mx-auto px-6">
        <SectionHeading
          label="Why hire me"
          title="What Sets Me Apart"
          subtitle="Beyond technical skills — these are the qualities that make working with me a great experience."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              initial={reduceMotion ? { opacity: 1 } : "hidden"}
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={!reduceMotion ? fadeUp : undefined}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.10]"
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
                {"imgSrc" in item ? (
                  <img src={item.imgSrc} alt="" className="w-5 h-5 object-contain" />
                ) : (
                  <item.icon className="text-zinc-400" size={18} />
                )}
              </div>
              <h3 className="text-base font-semibold text-white mb-1.5">
                {item.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
