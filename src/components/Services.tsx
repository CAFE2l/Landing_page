import { motion } from "framer-motion"

const cards = [
  {
    title: "Landing Pages",
    price: "$220",
    delivery: "5\u20137 business days",
    items: [
      "Unique responsive design",
      "Smooth animations and micro-interactions",
      "Contact form integrated with email or WhatsApp",
      "Basic on-page SEO",
      "Deployment on Vercel or Netlify",
    ],
  },
  {
    title: "Professional Websites",
    price: "$500",
    delivery: "10\u201315 business days",
    items: [
      "Up to 8 pages",
      "Mobile-first responsive design",
      "Contact forms",
      "Admin panel or editable content system",
      "Google Analytics setup",
      "SEO-friendly structure",
    ],
    featured: true,
  },
  {
    title: "Web Applications & SaaS",
    price: "Custom Quote",
    delivery: "depends on complexity",
    items: [
      "React or Next.js frontend",
      "Node.js backend",
      "Database integration",
      "REST API",
      "Authentication system",
      "Admin dashboard",
    ],
  },
]

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15 },
  },
}

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function Services() {
  return (
    <section id="services" className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-cafe-white mb-4">
            Services
          </h2>
          <p className="text-cafe-text max-w-xl mx-auto">
            Professional digital solutions tailored for international clients
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {cards.map((card) => (
            <motion.div
              key={card.title}
              variants={item}
              className={`relative rounded-2xl border p-8 transition-all duration-300 ${
                card.featured
                  ? "border-cafe-orange/30 bg-gradient-to-b from-cafe-orange/5 to-cafe-card shadow-[0_0_30px_rgba(249,115,22,0.08)]"
                  : "border-cafe-border bg-cafe-card hover:border-cafe-orange/20"
              }`}
            >
              {card.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-cafe-orange text-cafe-white text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-bold text-cafe-white mb-2">
                {card.title}
              </h3>

              <div className="mt-4 mb-1">
                <span className="text-3xl font-bold text-cafe-orange">
                  {card.price}
                </span>
              </div>

              <p className="text-sm text-cafe-text/60 mb-6">
                Delivery: {card.delivery}
              </p>

              <ul className="space-y-3">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-cafe-text">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-cafe-orange mt-0.5 shrink-0"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <a
                href="#contact"
                className={`mt-8 block text-center py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  card.featured
                    ? "bg-cafe-orange hover:bg-cafe-orange-light text-cafe-white shadow-[0_0_20px_rgba(249,115,22,0.2)]"
                    : "border border-cafe-border text-cafe-text hover:border-cafe-orange/50 hover:text-cafe-white"
                }`}
              >
                Get Started
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
