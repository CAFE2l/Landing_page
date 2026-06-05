import { useState, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Mic, Square, Trash2, Play, Send, Loader2 } from "lucide-react"

interface AudioRecorderProps {
  onSend: (blob: Blob, duration: number) => void
  onCancel: () => void
}

export default function AudioRecorder({ onSend, onCancel }: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle")
  const [duration, setDuration] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [sending, setSending] = useState(false)

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" })
      mediaRecorder.current = recorder
      chunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: recorder.mimeType })
        setPreviewUrl(URL.createObjectURL(blob))
        setState("preview")
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start()
      setState("recording")
      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 200)
    } catch {
      setState("idle")
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const cancelRecording = () => {
    cleanup()
    setState("idle")
    setDuration(0)
    onCancel()
  }

  const togglePreview = () => {
    if (!audioRef.current || !previewUrl) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.src = previewUrl
      audioRef.current.play()
      setIsPlaying(true)
      audioRef.current.onended = () => setIsPlaying(false)
    }
  }

  const handleSend = async () => {
    if (!chunks.current.length) return
    setSending(true)
    const blob = new Blob(chunks.current, { type: mediaRecorder.current?.mimeType || "audio/webm" })
    onSend(blob, duration)
    cleanup()
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]"
    >
      {state === "recording" ? (
        <>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="h-3 w-3 rounded-full bg-red-500 shrink-0"
          />
          <span className="text-sm font-mono text-red-400">{formatTime(duration)}</span>
          <div className="flex-1 h-8 flex items-center gap-0.5">
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [4, Math.random() * 28 + 4, 4] }}
                transition={{ duration: 0.4 + Math.random() * 0.4, repeat: Infinity, delay: Math.random() * 0.3 }}
                className="w-1 rounded-full bg-red-400/60"
              />
            ))}
          </div>
          <button onClick={stopRecording} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">
            <Square size={12} />
          </button>
        </>
      ) : state === "preview" ? (
        <>
          <button onClick={togglePreview} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4F6EF7]/20 text-[#4F6EF7] hover:bg-[#4F6EF7]/30 transition-all">
            {isPlaying ? <Square size={12} /> : <Play size={12} />}
          </button>
          <span className="text-sm font-mono text-white/70">{formatTime(duration)}</span>
          <div className="flex-1 h-1 rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-[#4F6EF7] transition-all" style={{ width: isPlaying ? "100%" : "0%" }} />
          </div>
          <button onClick={cancelRecording} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
            <Trash2 size={14} />
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F6EF7]/20 text-[#4F6EF7] hover:bg-[#4F6EF7]/30 transition-all disabled:opacity-40"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
          <audio ref={audioRef} className="hidden" />
        </>
      ) : (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm"
        >
          <Mic size={16} />
          Record audio
        </button>
      )}
    </motion.div>
  )
}
