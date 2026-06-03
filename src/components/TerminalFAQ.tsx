import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface HistoryEntry {
  question: string
  answer: string
  id: string
}

const questions = [
  { id: "01", question: "What services do you offer?",
    answer: "We offer landing pages, professional websites, web applications, SaaS solutions, digital identity packages, banners, presentations, documentation and content support." },
  { id: "02", question: "Do you work with international clients?",
    answer: "Yes. This page was created especially for international clients, with service descriptions, USD pricing and international payment options." },
  { id: "03", question: "What payment methods do you accept?",
    answer: "Payment methods can be discussed depending on what works best for both sides. Possible options include Wise, PayPal, Payoneer or bank transfer when available." },
  { id: "04", question: "How does the project process work?",
    answer: "The process usually starts with a project discussion, then requirements, design direction, development, testing, deployment and final delivery." },
  { id: "05", question: "Do you provide support after delivery?",
    answer: "Yes. After delivery, clients can receive support, updates and post-delivery communication through a VIP Telegram area or direct contact." },
  { id: "06", question: "Can the price change depending on the project?",
    answer: "Yes. Prices can change depending on project complexity, number of pages, features, integrations, deadlines and custom requirements." },
  { id: "07", question: "What technologies do you use?",
    answer: "The main technologies include React, Next.js, TypeScript, Tailwind CSS, Node.js, PostgreSQL, Firebase, Vercel and Netlify." },
  { id: "08", question: "How can I start a project?",
    answer: "You can start by clicking the contact button and sending a message with your project idea, goals, deadline and budget." },
]

function Typewriter({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("")
  const indexRef = useRef(0)

  useEffect(() => {
    indexRef.current = 0
    setDisplayed("")

    const interval = setInterval(() => {
      indexRef.current++
      setDisplayed(text.slice(0, indexRef.current))
      if (indexRef.current >= text.length) {
        clearInterval(interval)
        onDone?.()
      }
    }, 12)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  return <span>{displayed}</span>
}

export default function TerminalFAQ() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)

  const handleSelect = (q: (typeof questions)[0]) => {
    setSelectedId(q.id)
    setTyping(true)
    setShowAnswer(false)

    const entry: HistoryEntry = { id: q.id, question: q.question, answer: q.answer }
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.id !== q.id)
      return [...filtered, entry]
    })

    setTimeout(() => {
      setShowAnswer(true)
      setTimeout(() => {
        setTyping(false)
      }, q.answer.length * 12 + 100)
    }, 300)
  }

  const clearHistory = () => {
    setHistory([])
    setSelectedId(null)
    setShowAnswer(false)
    setTyping(false)
  }

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history, showAnswer, typing])

  return (
    <section id="faq" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cafe-orange/[0.02] via-transparent to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-cafe-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-cafe-text max-w-xl mx-auto">
            Choose a question below and get an instant answer.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="rounded-2xl border border-cafe-orange/20 bg-[#0a0a0f] shadow-[0_0_60px_rgba(249,115,22,0.06)] overflow-hidden backdrop-blur-sm">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#0d0d14] border-b border-cafe-orange/10">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs font-mono text-cafe-text/50 ml-2">
                cafestore ~ faq
              </span>
            </div>

            <div
              ref={terminalRef}
              className="p-5 sm:p-6 font-mono text-sm leading-relaxed max-h-[520px] overflow-y-auto scroll-smooth"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(249,115,22,0.2) transparent" }}
            >
              <div className="text-cafe-text/60 mb-4">
                <span className="text-cafe-orange">$</span> Hello, I&apos;m the CAFÉ STORE assistant.
                <br />
                <span className="text-cafe-orange">$</span> Choose a question below:
              </div>

              <div className="grid sm:grid-cols-2 gap-2 mb-6">
                {questions.map((q, i) => (
                  <motion.button
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    onClick={() => handleSelect(q)}
                    className={`text-left px-4 py-2.5 rounded-lg border text-sm font-mono transition-all duration-200 ${
                      selectedId === q.id
                        ? "border-cafe-orange/50 bg-cafe-orange/10 text-cafe-orange shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                        : "border-cafe-border/30 bg-cafe-card/30 text-cafe-text/70 hover:border-cafe-orange/30 hover:text-cafe-text-light hover:bg-cafe-orange/5 hover:shadow-[0_0_15px_rgba(249,115,22,0.05)] hover:scale-[1.02]"
                    }`}
                  >
                    <span className="text-cafe-orange/60 text-xs mr-2">{q.id}</span>
                    {q.question}
                  </motion.button>
                ))}
              </div>

              <AnimatePresence mode="popLayout">
                {history.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="mb-4 pb-4 border-b border-cafe-border/10 last:border-0"
                  >
                    <div className="text-cafe-orange mb-1.5">
                      <span className="text-cafe-orange">$</span> selected question:{" "}
                      <span className="text-cafe-text-light">{entry.question}</span>
                    </div>
                    <div className="text-cafe-text/80 pl-0">
                      <span className="text-cafe-yellow">&gt;</span>{" "}
                      {showAnswer && entry.id === selectedId ? (
                        <Typewriter text={entry.answer} />
                      ) : entry.id !== selectedId ? (
                        <span>{entry.answer}</span>
                      ) : null}
                      {entry.id === selectedId && typing && (
                        <span className="inline-block w-2 h-4 bg-cafe-orange/70 ml-0.5 animate-pulse" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {history.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-cafe-text/30 text-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-cafe-orange/50 animate-pulse" />
                  waiting for input...
                </motion.div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-xs text-cafe-text/30 font-mono">
              click a question to consult
            </span>
            {history.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={clearHistory}
                className="text-xs font-mono text-cafe-text/40 hover:text-cafe-orange transition-colors duration-200 px-3 py-1 rounded-md border border-transparent hover:border-cafe-orange/20"
              >
                clear terminal
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
