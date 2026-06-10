import type { Transition } from "framer-motion"

type PerfLevel = "mobile" | "desktop"

function getLevel(): PerfLevel {
  if (typeof window === "undefined") return "desktop"
  return window.innerWidth < 768 || "ontouchstart" in window ? "mobile" : "desktop"
}

export function perfBlur(desktop: number, mobile: number): string {
  return getLevel() === "mobile" ? `blur(${mobile}px)` : `blur(${desktop}px)`
}

export function perfBlurPx(desktop: number, mobile: number): number {
  return getLevel() === "mobile" ? mobile : desktop
}

export function perfOpacity(desktop: number, mobile: number): number {
  return getLevel() === "mobile" ? mobile : desktop
}

export function perfShadow(
  desktop: string,
  mobile: string = "0 4px 12px rgba(0,0,0,0.2)",
): string {
  return getLevel() === "mobile" ? mobile : desktop
}

export function perfAnimation<T>(
  desktop: T | undefined,
  mobile: T | undefined,
): T | undefined {
  return getLevel() === "mobile" ? mobile : desktop
}

export function perfTransition(desktop: Transition, mobile: Transition): Transition {
  return getLevel() === "mobile" ? mobile : desktop
}

export function perfSpring(stiffness: number, damping: number): Transition {
  if (getLevel() === "mobile") {
    return { type: "spring", stiffness: stiffness * 0.5, damping: damping * 0.7 }
  }
  return { type: "spring", stiffness, damping }
}

export function shouldReduceEffects(): boolean {
  return getLevel() === "mobile"
}

export function shouldDisableMouseEffects(): boolean {
  return getLevel() === "mobile" || "ontouchstart" in window
}

export function getParticleCount(desktop: number, mobile: number): number {
  return getLevel() === "mobile" ? mobile : desktop
}

export function shouldReduceOrbs(): boolean {
  return getLevel() === "mobile"
}
