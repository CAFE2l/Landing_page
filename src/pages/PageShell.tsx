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
      <main className="min-h-screen pt-32 pb-20">
        <section className="container mx-auto px-6">
          <div className="mb-10 max-w-3xl">
            <Link to="/" className="mb-6 inline-flex text-sm font-medium text-[#60a5fa] hover:text-white">
              Back to site
            </Link>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-[#0ea5e9]">{eyebrow}</p>
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-5">{title}</h1>
            <p className="text-zinc-500 leading-relaxed max-w-2xl">{subtitle}</p>
          </div>
          {children}
        </section>
      </main>
      <Footer />
    </>
  )
}
