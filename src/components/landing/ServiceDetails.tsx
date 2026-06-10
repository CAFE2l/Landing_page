"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ArrowRight, MonitorSmartphone, Globe, Code2, Smartphone, LayoutDashboard, Clock, DollarSign, Users, Shield } from "lucide-react"
import { useIsMobile } from "../../hooks/useMobile"
import SectionHeading from "./SectionHeading"
import WhatsAppIcon from "./WhatsAppIcon"
import { wa, WA_MESSAGES } from "../../lib/utils"

interface ServiceData {
  id: string
  icon: typeof MonitorSmartphone
  title: string
  summary: string
  overview: string
  bestFor: string[]
  features: string[]
  timeline: string
  startingPrice: string
  cta: string
  waMessage: string
}

const serviceDetails: ServiceData[] = [
  {
    id: "landing-pages",
    icon: MonitorSmartphone,
    title: "Landing Pages",
    summary: "High-converting, single-page experiences built for campaigns, launches, and lead capture.",
    overview: "A landing page is a focused, standalone web page designed to convert visitors into leads or customers. Unlike multi-page websites, landing pages eliminate distractions and guide visitors toward a single goal — whether that's signing up, purchasing, or contacting you. Every element is optimized for conversion: from the headline and copy to the imagery and call-to-action buttons.",
    bestFor: [
      "Startups launching a new product or service",
      "Marketing campaigns requiring dedicated pages",
      "Lead generation for service-based businesses",
      "Event registration and ticket sales",
      "Digital product launches and pre-orders",
    ],
    features: [
      "Responsive design optimized for all devices",
      "Conversion-focused layout with clear CTAs",
      "Framer Motion animations for engagement",
      "WhatsApp, email, and analytics integration",
      "Basic SEO setup for search visibility",
      "Contact forms with validation",
      "Fast loading with performance tuning",
      "One-click deploy to production",
    ],
    timeline: "5-7 business days",
    startingPrice: "$240",
    cta: "Start a Landing Page",
    waMessage: WA_MESSAGES.planLanding,
  },
  {
    id: "professional-website",
    icon: Globe,
    title: "Professional Website",
    summary: "Multi-page digital presence with CMS, SEO, analytics, and a structure that scales with your business.",
    overview: "A professional website is your brand's home on the internet. Unlike a single landing page, a multi-page website gives you the space to fully express your brand, showcase your portfolio or services, share your story, and provide multiple ways for visitors to engage with you. Built with a content management system, you can update content without touching code.",
    bestFor: [
      "Small to medium businesses establishing online presence",
      "Freelancers and agencies showcasing portfolios",
      "Restaurants, clinics, and local services",
      "Non-profits and community organizations",
      "Blogs and content-driven brands",
    ],
    features: [
      "Up to 8 custom pages with consistent design system",
      "Editable CMS for pages, blog, and media",
      "Mobile-first responsive layout",
      "Contact forms, maps, and social integration",
      "SEO optimization with meta tags and sitemap",
      "Performance tuning with Core Web Vitals",
      "Google Analytics and tracking setup",
      "Production deploy with CI/CD pipeline",
    ],
    timeline: "10-15 business days",
    startingPrice: "$560",
    cta: "Build My Website",
    waMessage: WA_MESSAGES.planWebsite,
  },
  {
    id: "web-applications",
    icon: Code2,
    title: "Web Applications",
    summary: "Full-stack apps with authentication, databases, APIs, and real-time features using modern frameworks.",
    overview: "Web applications go beyond static websites — they're interactive platforms that users can log into, manipulate data, and perform complex tasks. From client portals to booking systems, web applications combine a polished frontend with a powerful backend, giving you the tools to run your business operations online.",
    bestFor: [
      "Businesses needing custom client portals",
      "Service platforms with booking and scheduling",
      "E-learning and course delivery platforms",
      "Membership sites with gated content",
      "Internal tools and operations dashboards",
    ],
    features: [
      "React or Next.js frontend with TypeScript",
      "Authentication with login, roles, and permissions",
      "Database design with PostgreSQL or similar",
      "RESTful or GraphQL API endpoints",
      "Real-time features with WebSockets",
      "Admin dashboard for content management",
      "File upload and media management",
      "Stripe or PayPal payment integration",
    ],
    timeline: "Scoped after discovery call",
    startingPrice: "Custom quote",
    cta: "Build My App",
    waMessage: WA_MESSAGES.planSaaS,
  },
  {
    id: "saas-dashboards",
    icon: Smartphone,
    title: "SaaS & Dashboards",
    summary: "Scalable software platforms with multi-tenant architecture, admin panels, and data visualization.",
    overview: "SaaS platforms and dashboards are the most complex digital products we build. These are multi-user systems where each client has their own isolated environment, complete with analytics, reporting, and administrative controls. Built to scale from day one, SaaS products require careful architecture planning, robust security, and a seamless user experience.",
    bestFor: [
      "Founders building a software-as-a-service product",
      "Agencies needing white-label client dashboards",
      "Data-driven businesses requiring analytics platforms",
      "Marketplaces connecting buyers and sellers",
      "Platforms with subscription billing models",
    ],
    features: [
      "Multi-tenant architecture with data isolation",
      "User management with roles and permissions",
      "Interactive dashboards with data visualization",
      "Subscription billing with Stripe integration",
      "API for third-party integrations",
      "Admin panel with full system oversight",
      "Audit logging and security controls",
      "Automated deployment and monitoring",
    ],
    timeline: "Scoped after discovery call",
    startingPrice: "Custom quote",
    cta: "Discuss My Product",
    waMessage: WA_MESSAGES.planSaaS,
  },
]

interface ServiceDetailsProps {
  activeService: number | null
  onSelectService: (index: number | null) => void
}

const tabIcons = [MonitorSmartphone, Globe, Code2, LayoutDashboard]

export default function ServiceDetails({ activeService, onSelectService }: ServiceDetailsProps) {
  const isMobile = useIsMobile()
  const activeIndex = activeService !== null ? Math.min(activeService, serviceDetails.length - 1) : 0
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (activeService !== null && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [activeService])

  return (
    <section id="service-details" ref={sectionRef} className="py-20 md:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <SectionHeading
          label="Service Details"
          title="What Each Service Includes"
          subtitle="Understand what each service covers before starting your project."
        />

        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-8 sm:mb-10 justify-center">
            {serviceDetails.map((service, i) => {
              const TabIcon = tabIcons[i]
              const isActive = i === activeIndex
              return (
                <button
                  key={service.id}
                  onClick={() => onSelectService(i)}
                  className={`touch-target inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-[#2563eb] text-white border border-[#3b82f6]/50 shadow-[0_0_20px_rgba(37,99,235,0.35)]"
                      : "bg-white/[0.04] text-zinc-400 border border-white/[0.08] hover:bg-white/[0.08] hover:text-zinc-200"
                  }`}
                >
                  <TabIcon size={16} />
                  <span className={isMobile ? "text-xs" : "text-sm"}>{service.title}</span>
                </button>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="rounded-2xl border border-white/[0.08] bg-[#0a1628]/60 backdrop-blur-sm overflow-hidden"
            >
              <div className="p-6 sm:p-8 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#0a1628] border border-white/[0.08] flex items-center justify-center">
                    {(() => {
                      const Icon = serviceDetails[activeIndex].icon
                      return <Icon className="text-[#0ea5e9]" size={24} />
                    })()}
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      {serviceDetails[activeIndex].title}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      {serviceDetails[activeIndex].summary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Overview</h4>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        {serviceDetails[activeIndex].overview}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">
                        <Users size={14} className="inline mr-1.5 -mt-0.5" />
                        Best For
                      </h4>
                      <ul className="space-y-2">
                        {serviceDetails[activeIndex].bestFor.map((item) => (
                          <li key={item} className="flex gap-2.5 text-sm text-zinc-400">
                            <span className="mt-0.5 text-[#0ea5e9]">→</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h4 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">
                        <Shield size={14} className="inline mr-1.5 -mt-0.5" />
                        Included Features
                      </h4>
                      <ul className="space-y-2">
                        {serviceDetails[activeIndex].features.map((feature) => (
                          <li key={feature} className="flex gap-2.5 text-sm text-zinc-400">
                            <Check size={15} className="mt-0.5 shrink-0 text-[#0ea5e9]" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                        <Clock size={16} className="text-[#0ea5e9]" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Timeline</p>
                          <p className="text-sm font-semibold text-white">{serviceDetails[activeIndex].timeline}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                        <DollarSign size={16} className="text-[#0ea5e9]" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Starting At</p>
                          <p className="text-sm font-semibold text-white">{serviceDetails[activeIndex].startingPrice}</p>
                        </div>
                      </div>
                    </div>

                    <a
                      href={wa(serviceDetails[activeIndex].waMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="touch-target inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-[#2563eb] text-white border border-[#3b82f6]/50 shadow-[0_0_20px_rgba(37,99,235,0.35)] hover:bg-[#1d4ed8] px-6 py-3 text-sm font-semibold transition-all duration-300"
                    >
                      <WhatsAppIcon />
                      {serviceDetails[activeIndex].cta}
                      <ArrowRight size={15} />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
