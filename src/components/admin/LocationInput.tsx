"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "../../lib/utils"
import type { LocationData } from "../../lib/types/settings"

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  address: {
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
    country_code?: string
    postcode?: string
  }
}

interface ViaCEPResult {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  estado: string
}

interface LocationInputProps {
  value: string
  locationData: LocationData | null
  onChange: (display: string, data: LocationData | null) => void
  labelClass?: string
  label?: string
}

function nominatimSearch(query: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=6&accept-language=en`
  return fetch(url, {
    headers: { "User-Agent": "CAFE-Services/1.0" },
  }).then((r) => r.json())
}

function viacepSearch(cep: string): Promise<ViaCEPResult | null> {
  const clean = cep.replace(/\D/g, "")
  if (clean.length !== 8) return Promise.resolve(null)
  return fetch(`https://viacep.com.br/ws/${clean}/json/`)
    .then((r) => {
      if (!r.ok) return null
      return r.json().then((data) => (data.erro ? null : data))
    })
}

function buildLocationData(result: NominatimResult, source: "nominatim" | "manual"): LocationData {
  const addr = result.address || {}
  return {
    city: addr.city || addr.town || addr.village || "",
    state: addr.state || "",
    country: addr.country || "",
    countryCode: (addr.country_code || "").toUpperCase(),
    formattedAddress: result.display_name,
    latitude: parseFloat(result.lat) || null,
    longitude: parseFloat(result.lon) || null,
    placeId: String(result.place_id),
    source,
    postalCode: addr.postcode || "",
  }
}

function buildLocationDataFromCep(result: ViaCEPResult): LocationData {
  return {
    city: result.localidade,
    state: result.uf,
    country: "Brazil",
    countryCode: "BR",
    formattedAddress: `${result.localidade}, ${result.uf}, Brazil`,
    latitude: null,
    longitude: null,
    placeId: `viacep-${result.cep}`,
    source: "viacep",
    postalCode: result.cep,
  }
}

export default function LocationInput({
  value,
  locationData,
  onChange,
  className = "",
  labelClass = "",
  label = "Location",
}: LocationInputProps) {
  const [query, setQuery] = useState(value || "")
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [showCepTab, setShowCepTab] = useState(false)
  const [cepInput, setCepInput] = useState("")
  const [cepLoading, setCepLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [selected, setSelected] = useState(!!value)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQuery(value || "")
    setSelected(!!value)
  }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await nominatimSearch(q)
      setResults(data)
      setOpen(true)
      setActiveIndex(-1)
      if (data.length === 0) setError("No locations found. Try a different search.")
    } catch {
      setError("Could not search. Try again.")
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleQueryChange = (q: string) => {
    setQuery(q)
    setSelected(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 400)
  }

  const selectResult = (result: NominatimResult) => {
    const loc = buildLocationData(result, "nominatim")
    onChange(loc.formattedAddress, loc)
    setQuery(loc.formattedAddress)
    setSelected(true)
    setOpen(false)
    setResults([])
    setError(null)
  }

  const handleCepSearch = async () => {
    const clean = cepInput.replace(/\D/g, "")
    if (clean.length !== 8) {
      setError("Enter a valid 8-digit CEP.")
      return
    }
    setCepLoading(true)
    setError(null)
    try {
      const result = await viacepSearch(cepInput)
      if (result) {
        const loc = buildLocationDataFromCep(result)
        onChange(loc.formattedAddress, loc)
        setQuery(loc.formattedAddress)
        setSelected(true)
        setCepInput(formatCep(result.cep))
        setError(null)
      } else {
        setError("CEP not found.")
      }
    } catch {
      setError("Could not search CEP.")
    } finally {
      setCepLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault()
      selectResult(results[activeIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const clearSelection = () => {
    setQuery("")
    setSelected(false)
    onChange("", null)
    setResults([])
    setError(null)
    inputRef.current?.focus()
  }

  const formatCep = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 8)
    if (d.length <= 5) return d
    return `${d.slice(0, 5)}-${d.slice(5)}`
  }

  return (
    <div>
      {label ? <label className={labelClass}>{label}</label> : null}

      {/* Toggle: search or CEP */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowCepTab(false)}
          className={cn("text-xs font-medium transition-colors", !showCepTab ? "text-[#4f6ef7]" : "text-[#6b6b80] hover:text-[#f0f0f5]")}
        >
          Search city
        </button>
        <span className="text-[#4a4a5a] text-xs">|</span>
        <button
          type="button"
          onClick={() => setShowCepTab(true)}
          className={cn("text-xs font-medium transition-colors", showCepTab ? "text-[#4f6ef7]" : "text-[#6b6b80] hover:text-[#f0f0f5]")}
        >
          Search by postal code
        </button>
      </div>

      <div className="relative" ref={dropdownRef}>
        {showCepTab ? (
          <div className="flex gap-2">
            <input
              value={formatCep(cepInput)}
              onChange={(e) => setCepInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={(e) => { if (e.key === "Enter") { handleCepSearch() } }}
              placeholder="80000-000"
              className={cn(
                "flex-1 rounded-xl border px-4 py-2.5 text-sm text-[#f0f0f5] placeholder-[#4a4a5a] outline-none transition-all",
                error ? "border-red-400/40 bg-red-500/5" : "border-white/[0.08] bg-white/[0.04] focus:border-[#4f6ef7]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#4f6ef7]/20",
                className,
              )}
            />
            <button
              type="button"
              onClick={handleCepSearch}
              disabled={cepLoading || cepInput.replace(/\D/g, "").length !== 8}
              className="shrink-0 rounded-xl bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors disabled:opacity-50"
            >
              {cepLoading ? <Loader size={14} /> : "Search"}
            </button>
          </div>
        ) : (
          <div className={cn(
            "flex rounded-xl border overflow-hidden transition-all",
            error ? "border-red-400/40" : "focus-within:border-[#4f6ef7]/50 focus-within:ring-1 focus-within:ring-[#4f6ef7]/20",
            className,
          )}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => { if (results.length > 0) setOpen(true) }}
              onKeyDown={handleKeyDown}
              placeholder="Search city, state, country..."
              className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-[#f0f0f5] placeholder-[#4a4a5a] outline-none"
            />
            {selected && query ? (
              <button
                type="button"
                onClick={clearSelection}
                className="shrink-0 px-2 text-[#6b6b80] hover:text-[#f0f0f5] transition-colors"
              >
                <XIcon size={14} />
              </button>
            ) : loading ? (
              <div className="flex shrink-0 items-center px-3">
                <Loader size={14} />
              </div>
            ) : null}
          </div>
        )}

        {/* Suggestions dropdown */}
        {open && results.length > 0 ? (
          <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0d0d14] shadow-2xl backdrop-blur-2xl overflow-hidden">
            <div className="max-h-56 overflow-y-auto">
              {results.map((r, i) => {
                const addr = r.address || {}
                const city = addr.city || addr.town || addr.village || ""
                const state = addr.state || ""
                const country = addr.country || ""
                const secondary = [state, country].filter(Boolean).join(", ")
                return (
                  <button
                    key={r.place_id}
                    type="button"
                    onClick={() => selectResult(r)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors",
                      i === activeIndex ? "bg-[#4f6ef7]/12" : "hover:bg-white/[0.04]",
                    )}
                  >
                    <span className="text-sm text-[#f0f0f5] truncate">{city || r.display_name.split(",")[0]}</span>
                    <span className="text-xs text-[#6b6b80] truncate">{secondary || r.display_name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* Empty state */}
        {open && !loading && query.length >= 3 && results.length === 0 && !error ? (
          <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0d0d14] p-4 text-center shadow-2xl backdrop-blur-2xl">
            <p className="text-xs text-[#6b6b80]">No locations found. Try a different search.</p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      ) : null}

      {/* Selected preview */}
      {selected && locationData ? (
        <div className="mt-2 rounded-lg border border-[#4f6ef7]/15 bg-[#4f6ef7]/5 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#f0f0f5]">{locationData.formattedAddress}</p>
              <p className="text-[10px] text-[#6b6b80] mt-0.5">
                {[locationData.city, locationData.state, locationData.country].filter(Boolean).join(", ")}
                {locationData.latitude ? ` · ${locationData.latitude.toFixed(4)}, ${locationData.longitude?.toFixed(4)}` : ""}
              </p>
            </div>
            <span className={cn(
              "shrink-0 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded",
              locationData.source === "nominatim" ? "text-emerald-400 bg-emerald-400/10" :
              locationData.source === "viacep" ? "text-sky-400 bg-sky-400/10" :
              "text-amber-400 bg-amber-400/10",
            )}>
              {locationData.source}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Loader({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-[#6b6b80]">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
