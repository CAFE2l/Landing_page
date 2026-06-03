import { motion } from "framer-motion"

const methods = [
  {
    name: "Wise",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cafe-orange">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
      </svg>
    ),
  },
  {
    name: "PayPal",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cafe-orange">
        <path d="M7 11l2-7h6c3 0 5 2 5 5s-2 5-5 5h-3l-1 4" />
      </svg>
    ),
  },
  {
    name: "Payoneer",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cafe-orange">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
    name: "Bank Transfer",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cafe-text">
        <rect x="2" y="8" width="20" height="12" rx="2" />
        <path d="M2 12h20" />
        <path d="M8 4l4-2 4 2" />
      </svg>
    ),
  },
]

export default function Payment() {
  return (
    <section className="py-24 sm:py-32 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-cafe-white mb-4">
              Payment Options
            </h2>
            <p className="text-cafe-text max-w-2xl mx-auto leading-relaxed">
              For international projects, payment methods can be discussed
              depending on what works best for both sides.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
            {methods.map((method) => (
              <div
                key={method.name}
                className="flex flex-col items-center gap-3 px-6 py-8 rounded-2xl border border-cafe-border bg-cafe-card hover:border-cafe-orange/20 transition-all duration-200"
              >
                {method.icon}
                <span className="text-sm font-medium text-cafe-text-light">
                  {method.name}
                </span>
              </div>
            ))}
          </div>

          <div className="max-w-2xl mx-auto text-center px-6 py-8 rounded-2xl border border-cafe-border bg-cafe-card/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cafe-yellow">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              <span className="text-cafe-text-light font-medium">
                50% upfront + 50% before final delivery
              </span>
            </div>
            <p className="text-sm text-cafe-text">
              Usually, projects are split into 50% upfront and 50% before final delivery.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
