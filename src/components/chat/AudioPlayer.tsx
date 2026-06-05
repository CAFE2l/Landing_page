import { useState, useRef, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import { Play, Pause } from "lucide-react"

interface AudioPlayerProps {
  src: string
  duration?: number | null
  isOwn: boolean
  isPlaying: boolean
  onPlay: () => void
}

export default function AudioPlayer({ src, duration: propDuration, isOwn, isPlaying, onPlay }: AudioPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(propDuration || 0)
  const [loaded, setLoaded] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      if (audioRef.current.ended) {
        setCurrentTime(0)
        animFrameRef.current = null
        return
      }
      animFrameRef.current = requestAnimationFrame(updateProgress)
    }
  }, [])

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.currentTime = currentTime
      audioRef.current.play()
      animFrameRef.current = requestAnimationFrame(updateProgress)
    } else if (audioRef.current) {
      audioRef.current.pause()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isPlaying, currentTime, updateProgress])

  const handlePlay = () => {
    if (isPlaying) {
      onPlay()
    } else {
      onPlay()
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current && !loaded) {
      setDuration(audioRef.current.duration)
      setLoaded(true)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    const seekTime = pct * duration
    setCurrentTime(seekTime)
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        className="hidden"
      />
      <div className={`flex items-center gap-2 min-w-[200px] max-w-[260px] ${isOwn ? "flex-row" : "flex-row"}`}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handlePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          {isPlaying ? (
            <Pause size={14} className="text-white" />
          ) : (
            <Play size={14} className="text-white ml-0.5" />
          )}
        </motion.button>

        <div className="flex-1 min-w-0">
          <div
            className="h-1.5 rounded-full bg-white/[0.12] cursor-pointer relative overflow-hidden"
            onClick={handleSeek}
          >
            <motion.div
              className="h-full rounded-full bg-[#4F6EF7]"
              style={{ width: `${progress}%` }}
              layout
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-[10px] ${isOwn ? "text-blue-200/60" : "text-white/40"}`}>
              {formatTime(currentTime)}
            </span>
            <span className={`text-[10px] ${isOwn ? "text-blue-200/60" : "text-white/40"}`}>
              {formatTime(duration || propDuration || 0)}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
