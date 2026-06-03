import { motion } from "framer-motion"

const steps = [
  { number: 1, title: "Project discussion" },
  { number: 2, title: "Requirements and scope" },
  { number: 3, title: "Design direction" },
  { number: 4, title: "Development" },
  { number: 5, title: "Testing and adjustments" },
  { number: 6, title: "Deployment" },
  { number: 7, title: "Final delivery and support" },
]

export default function Process() {
  return (
    <section id="process" className="py-24 sm:py-32 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-cafe-white mb-4">
            How It Works
          </h2>
          <p className="text-cafe-text max-w-xl mx-auto">
            A clear and structured process from start to finish
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-[23px] sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-cafe-orange via-cafe-yellow to-transparent -translate-x-px sm:-translate-x-1/2 hidden sm:block" />

          <div className="space-y-8 sm:space-y-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className={`relative flex items-center gap-6 sm:gap-0 ${
                  index % 2 === 0
                    ? "sm:flex-row"
                    : "sm:flex-row-reverse"
                }`}
              >
                <div className="flex-1 sm:flex sm:justify-end">
                  <div
                    className={`sm:w-1/2 ${
                      index % 2 === 0 ? "sm:pr-12 sm:text-right" : "sm:pl-12"
                    }`}
                  >
                    <span className="text-xs font-bold text-cafe-orange tracking-widest uppercase">
                      Step {step.number}
                    </span>
                    <h3 className="text-lg font-semibold text-cafe-white mt-1">
                      {step.title}
                    </h3>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-center w-[46px] h-[46px] rounded-full border-2 border-cafe-orange bg-cafe-bg shrink-0">
                  <div className="w-2 h-2 rounded-full bg-cafe-orange" />
                </div>

                <div className="flex-1 sm:block hidden" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
