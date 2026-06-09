"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Link } from "react-router-dom"
import { ArrowRight, Check, Code2, LayoutDashboard, MonitorSmartphone } from "lucide-react"
import SectionHeading from "./SectionHeading"
import WhatsAppIcon from "./WhatsAppIcon"
import Magnetic from "./Magnetic"
import { wa, WA_MESSAGES } from "../../lib/utils"

type PlanPreviewType = "landing" | "website" | "saas"

const plans = [
  {
    number: "Plan 01",
    name: "Landing Pages",
    price: "From $240",
    timeline: "5-7 business days",
    tagline: "High-conversion pages for campaigns, launches, and lead capture.",
    icon: MonitorSmartphone,
    tags: ["Tailwind", "Framer Motion", "SEO", "WhatsApp"],
    features: [
      "Responsive interface with polished motion",
      "Conversion-focused sections and contact flow",
      "WhatsApp, email, and analytics integration",
      "Basic SEO setup and deploy included",
    ],
    cta: "Start a Landing Page",
    waMessage: WA_MESSAGES.planLanding,
    gradient: "from-blue-600/25 via-cyan-500/10 to-transparent",
    preview: "landing",
    previewUrl: "https://e-commerce-landing-page-lime.vercel.app/",
  },
  {
    number: "Plan 02",
    name: "Professional Websites",
    price: "From $560",
    timeline: "10-15 business days",
    tagline: "Complete digital presence for brands that need credibility and clarity.",
    icon: Code2,
    tags: ["React", "Next.js", "CMS", "Vercel"],
    features: [
      "Up to 8 custom pages with consistent design",
      "Editable content structure for portfolio or services",
      "Mobile-first layout with performance tuning",
      "Contact forms, tracking, and production deploy",
    ],
    cta: "Build My Website",
    waMessage: WA_MESSAGES.planWebsite,
    gradient: "from-sky-600/25 via-blue-500/10 to-transparent",
    preview: "website",
    previewUrl: "https://main-portfolio-sigma-flame.vercel.app/",
  },
  {
    number: "Plan 03",
    name: "Web Apps & SaaS",
    price: "Custom quote",
    timeline: "Scoped after discovery",
    tagline: "From MVP to a product that scales with real users and operations.",
    icon: LayoutDashboard,
    tags: ["Next.js", "Node.js", "Prisma", "PostgreSQL"],
    features: [
      "Frontend with React or Next.js and Tailwind",
      "Authentication, user roles, and admin dashboard",
      "Database, API routes, and documented flows",
      "Stripe, automations, and deployment pipeline",
    ],
    cta: "Discuss My Product",
    waMessage: WA_MESSAGES.planSaaS,
    featured: true,
    gradient: "from-blue-500/30 via-cyan-400/10 to-transparent",
    preview: "saas",
    previewUrl: "https://stream-pix-ashy.vercel.app/",
  },
] satisfies Array<{
  number: string
  name: string
  price: string
  timeline: string
  tagline: string
  icon: typeof MonitorSmartphone
  tags: string[]
  features: string[]
  cta: string
  waMessage: string
  gradient: string
  preview: PlanPreviewType
  previewUrl?: string
  featured?: boolean
}>

function PlanPreview({ type }: { type: PlanPreviewType }) {
  if (type === "landing") {
    return (
      <div className="absolute inset-x-4 sm:inset-x-5 top-10 sm:top-12 h-28 sm:h-36 overflow-hidden rounded-xl border border-white/[0.08] bg-[#06111b]/90 shadow-2xl shadow-black/40">
        <img
          src="/imgs/Plans/Produtos.png"
          alt="Landing page example preview"
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020408]/45 via-transparent to-transparent" />
      </div>
    )
  }

  if (type === "website") {
    return (
      <div className="absolute inset-x-4 sm:inset-x-5 top-10 sm:top-12 h-28 sm:h-36 overflow-hidden rounded-xl border border-white/[0.08] bg-[#07111d]/85 shadow-2xl shadow-black/40">
        <img
          src="/imgs/Plans/portfolio.png"
          alt="Professional website example preview"
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020408]/45 via-transparent to-transparent" />
      </div>
    )
  }

  if (type === "saas") {
    return (
      <div className="absolute inset-x-4 sm:inset-x-5 top-10 sm:top-12 h-28 sm:h-36 overflow-hidden rounded-xl border border-[#3b82f6]/20 bg-[#06101f]/90 shadow-2xl shadow-black/40">
        <img
          src="/imgs/Plans/banner.png"
          alt="Web app and SaaS example preview"
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020408]/45 via-transparent to-transparent" />
      </div>
    )
  }

  return null
}

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
    <section id="work" className="py-20 md:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <SectionHeading
          label="Pricing"
          title="Service Plans"
          subtitle="Clear starting points for modern web projects. Every plan is built with a tech-focused stack, clean motion, and production-ready delivery."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, i) => {
            const Icon = plan.icon
            return (
            <motion.div
              key={plan.name}
              custom={i}
              initial={reduceMotion ? { opacity: 1 } : "hidden"}
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={!reduceMotion ? fadeUp : undefined}
              whileHover={!reduceMotion ? { y: -6, transition: { duration: 0.2 } } : undefined}
              className={`group relative rounded-2xl border bg-white/[0.025] overflow-hidden transition-all duration-300 ${
                plan.featured
                  ? "border-[#3b82f6]/60 shadow-[0_0_36px_rgba(37,99,235,0.18)]"
                  : "border-white/[0.08] hover:border-blue-500/25 hover:shadow-[0_0_30px_rgba(37,99,235,0.08)]"
              }`}
            >
              {plan.featured && (
                <div className="absolute right-5 top-5 z-20 rounded-full border border-[#3b82f6]/30 bg-[#2563eb]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#93c5fd]">
                  Most requested
                </div>
              )}
              {plan.previewUrl ? (
                <a
                  href={plan.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View ${plan.name} example site`}
                  className={`relative block h-40 sm:h-56 bg-gradient-to-br ${plan.gradient} overflow-hidden group/preview`}
                >
                  <div className="absolute inset-0 bg-dot-grid opacity-50" />
                  <PlanPreview type={plan.preview} />
                  <div className="absolute left-4 sm:left-6 top-4 sm:top-6 text-[10px] uppercase tracking-[0.32em] text-zinc-600 font-semibold">
                    {plan.number}
                  </div>
                  <div className="absolute bottom-4 sm:bottom-5 left-4 sm:left-6 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-[#3b82f6]/25 bg-[#020408]/70 text-[#60a5fa] backdrop-blur-md">
                    <Icon size={22} />
                  </div>
                  <div className="absolute bottom-5 right-6 text-6xl font-bold text-white/[0.07] select-none">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020408] via-[#020408]/10 to-transparent" />
                  <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/20 transition-colors duration-300" />
                </a>
              ) : (
                <div className={`relative h-40 sm:h-56 bg-gradient-to-br ${plan.gradient} overflow-hidden`}>
                  <div className="absolute inset-0 bg-dot-grid opacity-50" />
                  <PlanPreview type={plan.preview} />
                  <div className="absolute left-4 sm:left-6 top-4 sm:top-6 text-[10px] uppercase tracking-[0.32em] text-zinc-600 font-semibold">
                    {plan.number}
                  </div>
                  <div className="absolute bottom-4 sm:bottom-5 left-4 sm:left-6 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-[#3b82f6]/25 bg-[#020408]/70 text-[#60a5fa] backdrop-blur-md">
                    <Icon size={22} />
                  </div>
                  <div className="absolute bottom-5 right-6 text-6xl font-bold text-white/[0.07] select-none">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020408] via-[#020408]/10 to-transparent" />
                </div>
              )}

              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {plan.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-500 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-5">
                  {plan.tagline}
                </p>
                <div className="mb-6 border-b border-white/[0.08] pb-5">
                  <p className="text-xs uppercase tracking-widest text-zinc-600 font-semibold mb-1">Starting at</p>
                  <p className="text-3xl font-bold text-white">
                    {plan.price}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">Timeline: {plan.timeline}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm text-zinc-400 leading-relaxed">
                      <Check size={15} className="mt-0.5 shrink-0 text-[#0ea5e9]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Magnetic strength={0.12}>
                  {plan.preview === "saas" ? (
                    <a
                      href={wa(plan.waMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`touch-target inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                        plan.featured
                          ? "bg-[#2563eb] text-white border border-[#3b82f6]/50 shadow-[0_0_20px_rgba(37,99,235,0.35)] hover:bg-[#1d4ed8]"
                          : "border border-white/[0.1] text-white hover:border-[#3b82f6]/40 hover:bg-[#2563eb]/10"
                      } relative z-20`}
                    >
                      <WhatsAppIcon />
                      {plan.cta}
                      <ArrowRight size={15} />
                    </a>
                  ) : (
                    <Link
                      to={`/hire/${plan.preview === "landing" ? "landing-page" : "website"}`}
                      className={`touch-target inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                        plan.featured
                          ? "bg-[#2563eb] text-white border border-[#3b82f6]/50 shadow-[0_0_20px_rgba(37,99,235,0.35)] hover:bg-[#1d4ed8]"
                          : "border border-white/[0.1] text-white hover:border-[#3b82f6]/40 hover:bg-[#2563eb]/10"
                      } relative z-20`}
                    >
                      <WhatsAppIcon />
                      {plan.cta}
                      <ArrowRight size={15} />
                    </Link>
                  )}
                </Magnetic>
              </div>
            </motion.div>
          )})}
        </div>
      </div>
    </section>
  )
}
