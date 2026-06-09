import { Link } from "react-router-dom"
import FloatingOrbs from "../components/landing/FloatingOrbs"
import Navbar from "../components/landing/Navbar"
import Footer from "../components/landing/Footer"

interface PageShellProps {
  eyebrow: string
  title: string
  subtitle: string
  children: React.ReactNode
}

export default function PageShell({ eyebrow, title, subtitle, children }: PageShellProps) {
  return (
    <>
      <FloatingOrbs />
      <Navbar />
      <main className="min-h-screen pt-24 pb-14 sm:pt-32 sm:pb-20">
        <section className="container mx-auto px-4 sm:px-6">
          <div className="mb-7 max-w-3xl sm:mb-10">
            <Link to="/" className="mb-5 inline-flex min-h-11 items-center text-sm font-medium text-[#60a5fa] hover:text-white sm:mb-6">
              Back to site
            </Link>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0ea5e9] sm:mb-4 sm:tracking-[0.32em]">{eyebrow}</p>
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-6xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">{subtitle}</p>
          </div>
          {children}
        </section>
      </main>
      <Footer />
    </>
  )
}
