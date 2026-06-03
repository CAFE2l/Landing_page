import { motion } from "framer-motion"

const includes = [
  "2 banners + favicon",
  "2 icons for brand/app",
  "10-slide presentation",
  "Complete web application",
  "High-converting landing page",
  "3 short videos",
  "1 long video",
  "10-page documentation",
]

export default function CompletePackage() {
  return (
    <section id="packages" className="py-24 sm:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-cafe-orange/[0.02] via-transparent to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl border border-cafe-orange/20 bg-gradient-to-b from-cafe-orange/5 via-cafe-card to-cafe-card p-8 sm:p-12 lg:p-16 shadow-[0_0_60px_rgba(249,115,22,0.06)]"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-cafe-orange/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-cafe-white mb-4">
                Complete Digital Identity Package
              </h2>
              <div className="mt-4 mb-3">
                <span className="text-4xl sm:text-5xl font-bold text-cafe-orange">
                  Starting at $1,800
                </span>
                <span className="text-cafe-text mx-3">/</span>
                <span className="text-cafe-text text-lg">Custom Quote</span>
              </div>
              <p className="text-cafe-text max-w-2xl mx-auto leading-relaxed">
                A complete digital presence package for brands that need design,
                web development, content and documentation in one project.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {includes.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-cafe-border bg-cafe-bg/50"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-cafe-orange shrink-0"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-sm text-cafe-text-light">{item}</span>
                </div>
              ))}
            </div>

            <div className="text-center">
              <a
                href="#contact"
                className="inline-block bg-cafe-orange hover:bg-cafe-orange-light text-cafe-white px-10 py-4 rounded-xl text-base font-semibold transition-all duration-200 shadow-[0_0_30px_rgba(249,115,22,0.25)] hover:shadow-[0_0_50px_rgba(249,115,22,0.4)]"
              >
                I want the complete package
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
