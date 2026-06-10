import { useState } from "react"
import CursorSpotlight from "../components/landing/CursorSpotlight"
import ReadingProgress from "../components/landing/ReadingProgress"
import FloatingOrbs from "../components/landing/FloatingOrbs"
import Navbar from "../components/landing/Navbar"
import Hero from "../components/landing/Hero"
import TechMarquee from "../components/landing/TechMarquee"
import Services from "../components/landing/Services"
import Process from "../components/landing/Process"
import FeaturedWork from "../components/landing/FeaturedWork"
import Differentials from "../components/landing/Differentials"
import ServiceDetails from "../components/landing/ServiceDetails"
import TerminalFAQ from "../components/landing/TerminalFAQ"
import Contact from "../components/landing/Contact"
import Footer from "../components/landing/Footer"

export default function LandingPage() {
  const [activeService, setActiveService] = useState<number | null>(null)

  return (
    <>
      <CursorSpotlight />
      <ReadingProgress />
      <FloatingOrbs />
      <Navbar />
      <main>
        <Hero />
        <TechMarquee />
        <Services onLearnMore={(i) => setActiveService(i)} />
        <Process />
        <FeaturedWork />
        <Differentials />
        <ServiceDetails activeService={activeService} onSelectService={setActiveService} />
        <TerminalFAQ />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
