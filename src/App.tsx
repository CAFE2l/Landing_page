import Navbar from "./components/Navbar"
import Hero from "./components/Hero"
import Services from "./components/Services"
import CompletePackage from "./components/CompletePackage"
import WhyPrices from "./components/WhyPrices"
import Payment from "./components/Payment"
import Process from "./components/Process"
import Community from "./components/Community"
import FAQ from "./components/FAQ"
import Footer from "./components/Footer"

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Services />
        <CompletePackage />
        <WhyPrices />
        <Payment />
        <Process />
        <Community />
        <FAQ />
      </main>
      <Footer />
    </>
  )
}

export default App
