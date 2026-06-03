import { motion } from "framer-motion"

export default function WhyPrices() {
  return (
    <section className="py-24 sm:py-32 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cafe-orange/10 border border-cafe-orange/20 mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cafe-orange">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-cafe-white mb-6">
            Why These Prices?
          </h2>

          <div className="max-w-3xl mx-auto">
            <p className="text-cafe-text text-lg leading-relaxed">
              Since I&apos;m currently expanding my services to international
              clients, these prices are still competitive compared to the global
              market. This allows me to build international experience while still
              delivering <span className="text-cafe-white font-medium">professional quality</span>,
              <span className="text-cafe-white font-medium"> clear communication</span> and
              <span className="text-cafe-white font-medium"> dedicated support</span>.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
