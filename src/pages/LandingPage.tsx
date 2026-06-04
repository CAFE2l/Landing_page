import FloatingOrbs from "../components/landing/FloatingOrbs"
import Navbar from "../components/landing/Navbar"
import Hero from "../components/landing/Hero"
import TechMarquee from "../components/landing/TechMarquee"
import Services from "../components/landing/Services"
import Process from "../components/landing/Process"
import FeaturedWork from "../components/landing/FeaturedWork"
import Differentials from "../components/landing/Differentials"
import Testimonials from "../components/landing/Testimonials"
import TerminalFAQ from "../components/landing/TerminalFAQ"
import Contact from "../components/landing/Contact"
import Footer from "../components/landing/Footer"
import type { FeedbackEntry } from "../data/feedbackStore"

interface LandingPageProps {
  feedbacks: FeedbackEntry[]
}

export default function LandingPage({ feedbacks }: LandingPageProps) {
  return (
    <>
      <FloatingOrbs />
      <Navbar />
      <main>
        <Hero />
        <TechMarquee />
        <Services />
        <Process />
        <FeaturedWork />
        <Differentials />
        <Testimonials feedbacks={feedbacks} />
        <TerminalFAQ />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
