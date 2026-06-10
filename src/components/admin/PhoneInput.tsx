"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { parsePhoneNumberWithError, AsYouType, isValidPhoneNumber, getCountries, getCountryCallingCode } from "libphonenumber-js"
import type { CountryCode } from "libphonenumber-js"
import { cn } from "../../lib/utils"
import type { PhoneData } from "../../lib/types/settings"

interface CountryEntry {
  code: string
  name: string
  callingCode: string
}

function getFlagEmoji(countryCode: string): string {
  const cp = countryCode.toUpperCase().split("").map((c) => 0x1F1E6 + c.charCodeAt(0) - 65)
  return String.fromCodePoint(...cp)
}

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brazil",
  US: "United States",
  PT: "Portugal",
  AO: "Angola",
  ZA: "South Africa",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  ES: "Spain",
  FR: "France",
  DE: "Germany",
  GB: "United Kingdom",
  IT: "Italy",
  JP: "Japan",
  MX: "Mexico",
  CA: "Canada",
  AU: "Australia",
  NZ: "New Zealand",
  IN: "India",
  CN: "China",
  RU: "Russia",
  KR: "South Korea",
  NL: "Netherlands",
  CH: "Switzerland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  IE: "Ireland",
  BE: "Belgium",
  AT: "Austria",
  PL: "Poland",
  CZ: "Czech Republic",
  HU: "Hungary",
  RO: "Romania",
  GR: "Greece",
  TR: "Turkey",
  IL: "Israel",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  SG: "Singapore",
  HK: "Hong Kong",
  TW: "Taiwan",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  ID: "Indonesia",
  MY: "Malaysia",
  EG: "Egypt",
  NG: "Nigeria",
  KE: "Kenya",
  MA: "Morocco",
  TN: "Tunisia",
  DZ: "Algeria",
  PE: "Peru",
  UY: "Uruguay",
  PY: "Paraguay",
  BO: "Bolivia",
}

const ALLOWED_COUNTRIES = Object.keys(COUNTRY_NAMES)

const COUNTRIES: CountryEntry[] = ALLOWED_COUNTRIES
  .map((code) => ({
    code,
    name: COUNTRY_NAMES[code],
    callingCode: getCountryCallingCode(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

interface PhoneInputProps {
  value: string
  phoneData: PhoneData | null
  onChange: (e164: string, data: PhoneData | null) => void
  placeholder?: string
  labelClass?: string
  label?: string
}

const cc = (code: string) => code as CountryCode

export default function PhoneInput({
  value,
  phoneData,
  onChange,
  placeholder = "+55 (41) 99999-9999",
  labelClass = "",
  label = "WhatsApp",
}: PhoneInputProps) {
  const [display, setDisplay] = useState("")
  const [countryCode, setCountryCode] = useState(phoneData?.countryCode || "BR")
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const justSelected = useRef(false)

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES.find((c) => c.code === "BR")!

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false
      return
    }
    if (!value) {
      setDisplay("")
      return
    }
    try {
      const parsed = parsePhoneNumberWithError(value)
      if (parsed && parsed.country && getCountries().includes(cc(parsed.country))) {
        setCountryCode(parsed.country || "BR")
      }
      const asYouType = new AsYouType(cc(parsed?.country || "BR"))
      const formatted = asYouType.input(value)
      setDisplay(formatted)
    } catch {
      const digits = value.replace(/\D/g, "")
      if (digits.length > 0) {
        const asYouType = new AsYouType(cc(countryCode))
        const formatted = asYouType.input(`+${selectedCountry.callingCode}${digits}`)
        setDisplay(formatted)
      } else {
        setDisplay("")
      }
    }
  }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleInput = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "")
    const fullDigits = selectedCountry.callingCode + digits
    const asYouType = new AsYouType(cc(countryCode))
    const formatted = asYouType.input(`+${fullDigits}`)
    setDisplay(formatted)
    setError(null)

    const e164 = `+${fullDigits}`
    if (isValidPhoneNumber(e164)) {
      try {
        const parsed = parsePhoneNumberWithError(e164)
        onChange(e164, {
          countryCode: parsed.country || countryCode,
          callingCode: selectedCountry.callingCode,
          nationalNumber: parsed.nationalNumber,
          internationalNumber: parsed.number,
          formattedNumber: parsed.formatInternational(),
        })
      } catch {
        onChange(e164, null)
      }
    } else {
      if (digits.length > 0) {
        onChange(e164, null)
      } else {
        onChange("", null)
      }
    }
  }, [countryCode, selectedCountry, onChange])

  const selectCountry = (cc: string) => {
    setCountryCode(cc)
    setOpen(false)
    setSearch("")
    justSelected.current = true
    const digits = display.replace(/\D/g, "")
    if (digits.length > 0) {
      const country = COUNTRIES.find((c) => c.code === cc)!
      const fullDigits = country.callingCode + digits
      const asYouType = new AsYouType(cc(cc))
      const formatted = asYouType.input(`+${fullDigits}`)
      setDisplay(formatted)
      setError(null)
      const e164 = `+${fullDigits}`
      if (isValidPhoneNumber(e164)) {
        try {
          const parsed = parsePhoneNumberWithError(e164)
          onChange(e164, {
            countryCode: cc,
            callingCode: country.callingCode,
            nationalNumber: parsed.nationalNumber,
            internationalNumber: parsed.number,
            formattedNumber: parsed.formatInternational(),
          })
        } catch {
          onChange(e164, null)
        }
      } else {
        onChange(e164, null)
      }
    }
  }

  const handleBlur = () => {
    setFocused(false)
    if (display.replace(/\D/g, "").length > 0) {
      const digits = display.replace(/\D/g, "")
      const fullDigits = selectedCountry.callingCode + digits
      const e164 = `+${fullDigits}`
      if (!isValidPhoneNumber(e164, cc(countryCode))) {
        setError("Enter a valid WhatsApp number.")
      } else {
        setError(null)
      }
    }
  }

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.callingCode.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      {label ? <label className={labelClass}>{label}</label> : null}
      <div className="relative" ref={dropdownRef}>
        <div className={cn("flex rounded-xl border overflow-hidden transition-all", focused ? "border-[#4f6ef7]/50 ring-1 ring-[#4f6ef7]/20 bg-white/[0.06]" : "border-white/[0.08] bg-white/[0.04]", error ? "border-red-400/40" : "")}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex shrink-0 items-center gap-1.5 border-r border-white/[0.08] px-3 py-2.5 text-sm text-[#f0f0f5] hover:bg-white/[0.04] transition-colors"
          >
            <span className="text-base leading-none">{getFlagEmoji(selectedCountry.code)}</span>
            <span className="text-xs text-[#6b6b80]">+{selectedCountry.callingCode}</span>
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none" className={cn("transition-transform", open ? "rotate-180" : "")}>
              <path d="M1 1.5L4 4.5L7 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="tel"
            value={display}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#f0f0f5] placeholder-[#4a4a5a] outline-none"
            autoComplete="tel"
          />
        </div>

        {open ? (
          <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-xl border border-white/[0.08] bg-[#0d0d14] shadow-2xl backdrop-blur-2xl overflow-hidden">
            <div className="border-b border-white/[0.06] p-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-xs text-[#f0f0f5] placeholder-[#4a4a5a] outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-4 text-xs text-[#6b6b80] text-center">No countries found</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => selectCountry(c.code)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                      c.code === countryCode ? "bg-[#4f6ef7]/12 text-[#f0f0f5]" : "text-[#8a8a9a] hover:bg-white/[0.04] hover:text-[#f0f0f5]",
                    )}
                  >
                    <span className="text-base leading-none">{getFlagEmoji(c.code)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-[#6b6b80]">+{c.callingCode}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      ) : null}
    </div>
  )
}
