"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface HistoryEntry {
  id: string
  question: string
  answer: string
}

const questions = [
  {
    id: "01",
    question: "What services do you offer?",
    answer:
      "We offer landing pages, professional websites, web applications, SaaS solutions, digital identity packages, banners, presentations, documentation and content support.",
  },
  {
    id: "02",
    question: "Do you work with international clients?",
    answer:
      "Yes. This page was created especially for international clients, with service descriptions, USD pricing and international payment options.",
  },
  {
    id: "03",
    question: "What payment methods do you accept?",
    answer:
      "Payment methods can be discussed depending on what works best for both sides. Possible options include Wise, PayPal, Payoneer or bank transfer when available.",
  },
  {
    id: "04",
    question: "How does the project process work?",
    answer:
      "The process usually starts with a project discussion, then requirements, design direction, development, testing, deployment and final delivery.",
  },
  {
    id: "05",
    question: "Do you provide support after delivery?",
    answer:
      "Yes. After delivery, clients can receive support, updates and post-delivery communication through a VIP Telegram area or direct contact.",
  },
  {
    id: "06",
    question: "Can the price change depending on the project?",
    answer:
      "Yes. Prices can change depending on project complexity, number of pages, features, integrations, deadlines and custom requirements.",
  },
  {
    id: "07",
    question: "What technologies do you use?",
    answer:
      "The main technologies include React, Next.js, TypeScript, Tailwind CSS, Node.js, PostgreSQL, Firebase, Vercel and Netlify.",
  },
  {
    id: "08",
    question: "How can I start a project?",
    answer:
      "You can start by clicking the contact button and sending a message with your project idea, goals, deadline and budget.",
  },
]

function Typewriter({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("")
  const idx = useRef(0)

  useEffect(() => {
    idx.current = 0
    setDisplayed("")
    const interval = setInterval(() => {
      idx.current++
      setDisplayed(text.slice(0, idx.current))
      if (idx.current >= text.length) {
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

    setHistory((prev) => {
      const filtered = prev.filter((e) => e.id !== q.id)
      return [...filtered, { id: q.id, question: q.question, answer: q.answer }]
    })

    setTimeout(() => {
      setShowAnswer(true)
      setTimeout(() => {
        setTyping(false)
      }, q.answer.length * 12 + 100)
    }, 250)
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
    <section id="faq" className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-zinc-500 text-sm max-w-xl mx-auto">
            Choose a question below and get an instant answer.
          </p>
          <div className="h-px w-12 bg-zinc-800 mx-auto mt-6" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="rounded-2xl border border-blue-500/20 bg-[#0a1628] shadow-[0_0_40px_rgba(37,99,235,0.06)] overflow-hidden backdrop-blur-sm">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#060d14] border-b border-blue-500/10">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs font-mono text-zinc-600 ml-2">
                cafestore ~ faq
              </span>
            </div>

            <div
              ref={terminalRef}
              className="p-5 sm:p-6 font-mono text-sm leading-relaxed max-h-[560px] overflow-y-auto"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(37,99,235,0.15) transparent",
              }}
            >
              <div className="text-zinc-500/70 mb-5">
                <span className="text-blue-500 font-semibold">$</span> Hello,
                I&apos;m the{" "}
                <span className="text-blue-500 font-semibold">
                  CAFÉ SERVICES
                </span>{" "}
                assistant.
                <br />
                <span className="text-blue-500 font-semibold">$</span> Choose a
                question below:
              </div>

              <div className="grid sm:grid-cols-2 gap-2 mb-6">
                {questions.map((q, i) => {
                  const isSelected = selectedId === q.id
                  return (
                    <motion.button
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleSelect(q)}
                      className={`text-left px-4 py-2.5 rounded-lg border text-sm font-mono transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500/50 bg-blue-500/10 text-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.12)]"
                          : "border-white/10 bg-white/[0.03] text-zinc-500/70 hover:border-blue-500/30 hover:text-zinc-300 hover:bg-blue-500/5 hover:shadow-[0_0_15px_rgba(37,99,235,0.06)]"
                      }`}
                    >
                      <span className="text-zinc-600 text-xs mr-2">
                        {q.id}
                      </span>
                      {q.question}
                    </motion.button>
                  )
                })}
              </div>

              <AnimatePresence mode="popLayout">
                {history.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="mb-4 pb-4 border-b border-white/[0.04] last:border-0"
                  >
                    <div className="text-blue-500 mb-1.5">
                      <span className="text-blue-500 font-semibold">$</span>{" "}
                      selected question:{" "}
                      <span className="text-zinc-200 font-semibold">
                        {entry.question}
                      </span>
                    </div>
                    <div className="text-zinc-400/80 pl-0">
                      <span className="text-blue-500/80 font-semibold">
                        &gt;
                      </span>{" "}
                      {showAnswer && entry.id === selectedId ? (
                        <Typewriter text={entry.answer} />
                      ) : entry.id !== selectedId ? (
                        <span>{entry.answer}</span>
                      ) : null}
                      {entry.id === selectedId && typing && (
                        <span className="inline-block w-2 h-4 bg-blue-500/70 ml-0.5 animate-pulse" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {history.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-zinc-600 text-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 animate-pulse" />
                  waiting for input...
                </motion.div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-xs text-zinc-600 font-mono">
              click a question to consult
            </span>
            {history.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={clearHistory}
                className="text-xs font-mono text-zinc-600 hover:text-blue-500 transition-colors duration-200 px-3 py-1 rounded-md border border-transparent hover:border-blue-500/20"
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
