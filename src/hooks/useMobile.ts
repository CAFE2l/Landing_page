import { useState, useEffect, useMemo } from "react"

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < 768 || "ontouchstart" in window
  })

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  return isMobile
}

export function usePerformanceMode(): "mobile" | "desktop" {
  const isMobile = useIsMobile()
  return isMobile ? "mobile" : "desktop"
}

export function useReducedAnimations(): boolean {
  const isMobile = useIsMobile()
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  return isMobile || prefersReduced
}

export function useReduceMotion(): boolean {
  return useReducedAnimations()
}
