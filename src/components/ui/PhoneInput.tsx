"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronDown, Search, X, Phone } from "lucide-react"
import { AsYouType, parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js"
import type { CountryCode } from "libphonenumber-js"
import { cn } from "../../lib/utils"

export interface Country {
  code: string
  name: string
  emoji: string
  callingCode: string
}

export interface PhoneFields {
  phone_country_code: string
  phone_country: string
  phone_number: string
  phone_e164: string
}

const COUNTRIES: Country[] = [
  { code: "BR", name: "Brazil", emoji: "🇧🇷", callingCode: "55" },
  { code: "US", name: "United States", emoji: "🇺🇸", callingCode: "1" },
  { code: "GB", name: "United Kingdom", emoji: "🇬🇧", callingCode: "44" },
  { code: "PT", name: "Portugal", emoji: "🇵🇹", callingCode: "351" },
  { code: "AO", name: "Angola", emoji: "🇦🇴", callingCode: "244" },
  { code: "MZ", name: "Mozambique", emoji: "🇲🇿", callingCode: "258" },
  { code: "CA", name: "Canada", emoji: "🇨🇦", callingCode: "1" },
  { code: "FR", name: "France", emoji: "🇫🇷", callingCode: "33" },
  { code: "DE", name: "Germany", emoji: "🇩🇪", callingCode: "49" },
  { code: "ES", name: "Spain", emoji: "🇪🇸", callingCode: "34" },
  { code: "IT", name: "Italy", emoji: "🇮🇹", callingCode: "39" },
  { code: "NL", name: "Netherlands", emoji: "🇳🇱", callingCode: "31" },
  { code: "IE", name: "Ireland", emoji: "🇮🇪", callingCode: "353" },
  { code: "MX", name: "Mexico", emoji: "🇲🇽", callingCode: "52" },
  { code: "AR", name: "Argentina", emoji: "🇦🇷", callingCode: "54" },
  { code: "CL", name: "Chile", emoji: "🇨🇱", callingCode: "56" },
  { code: "CO", name: "Colombia", emoji: "🇨🇴", callingCode: "57" },
  { code: "PE", name: "Peru", emoji: "🇵🇪", callingCode: "51" },
  { code: "UY", name: "Uruguay", emoji: "🇺🇾", callingCode: "598" },
  { code: "PY", name: "Paraguay", emoji: "🇵🇾", callingCode: "595" },
  { code: "JP", name: "Japan", emoji: "🇯🇵", callingCode: "81" },
  { code: "KR", name: "South Korea", emoji: "🇰🇷", callingCode: "82" },
  { code: "CN", name: "China", emoji: "🇨🇳", callingCode: "86" },
  { code: "IN", name: "India", emoji: "🇮🇳", callingCode: "91" },
  { code: "AU", name: "Australia", emoji: "🇦🇺", callingCode: "61" },
  { code: "NZ", name: "New Zealand", emoji: "🇳🇿", callingCode: "64" },
  { code: "ZA", name: "South Africa", emoji: "🇿🇦", callingCode: "27" },
  { code: "NG", name: "Nigeria", emoji: "🇳🇬", callingCode: "234" },
  { code: "KE", name: "Kenya", emoji: "🇰🇪", callingCode: "254" },
  { code: "AE", name: "United Arab Emirates", emoji: "🇦🇪", callingCode: "971" },
  { code: "SA", name: "Saudi Arabia", emoji: "🇸🇦", callingCode: "966" },
  { code: "TR", name: "Turkey", emoji: "🇹🇷", callingCode: "90" },
  { code: "IL", name: "Israel", emoji: "🇮🇱", callingCode: "972" },
  { code: "RU", name: "Russia", emoji: "🇷🇺", callingCode: "7" },
  { code: "SE", name: "Sweden", emoji: "🇸🇪", callingCode: "46" },
  { code: "NO", name: "Norway", emoji: "🇳🇴", callingCode: "47" },
  { code: "DK", name: "Denmark", emoji: "🇩🇰", callingCode: "45" },
  { code: "FI", name: "Finland", emoji: "🇫🇮", callingCode: "358" },
  { code: "CH", name: "Switzerland", emoji: "🇨🇭", callingCode: "41" },
  { code: "BE", name: "Belgium", emoji: "🇧🇪", callingCode: "32" },
  { code: "AT", name: "Austria", emoji: "🇦🇹", callingCode: "43" },
  { code: "PL", name: "Poland", emoji: "🇵🇱", callingCode: "48" },
  { code: "EG", name: "Egypt", emoji: "🇪🇬", callingCode: "20" },
  { code: "MA", name: "Morocco", emoji: "🇲🇦", callingCode: "212" },
]

const MAX_NATIONAL_DIGITS: Record<string, number> = {
  BR: 11,
}

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code)
}

export function getCountryByCallingCode(callingCode: string): Country | undefined {
  return COUNTRIES.find((c) => c.callingCode === callingCode)
}

export function parseE164(value: string): { country?: Country; nationalNumber: string } {
  const parsed = parsePhoneNumberFromString(value)
  if (parsed && parsed.country) {
    const country = getCountryByCode(parsed.country)
    return { country, nationalNumber: parsed.nationalNumber }
  }
  const digits = value.replace(/\D/g, "")
  const fallbackCountry = getCountryByCode("BR")
  if (fallbackCountry) {
    return { country: fallbackCountry, nationalNumber: limitNationalDigits(digits, fallbackCountry) }
  }
  return { nationalNumber: digits }
}

export function toPhoneFields(e164: string, fallbackCountry = "BR"): PhoneFields | null {
  if (!e164) return null
  const parsed = parsePhoneNumberFromString(e164)
  if (parsed?.country) {
    return {
      phone_country_code: `+${parsed.countryCallingCode}`,
      phone_country: parsed.country,
      phone_number: parsed.nationalNumber,
      phone_e164: parsed.format("E.164"),
    }
  }
  const country = getCountryByCode(fallbackCountry)
  const digits = e164.replace(/\D/g, "")
  if (!country || !digits) return null
  const national = stripLeadingCountryCode(digits, country)
  return {
    phone_country_code: `+${country.callingCode}`,
    phone_country: country.code,
    phone_number: national,
    phone_e164: `+${country.callingCode}${national}`,
  }
}

function getMaxNationalDigits(country: Country): number {
  return MAX_NATIONAL_DIGITS[country.code] ?? 15
}

function stripLeadingCountryCode(digits: string, country: Country): string {
  const cc = country.callingCode
  const maxLen = getMaxNationalDigits(country)
  if (!digits.startsWith(cc)) return digits

  const local = digits.slice(cc.length)
  if (country.code === "BR") {
    return local.length <= maxLen ? local : local.slice(0, maxLen)
  }
  if (digits.length > maxLen) {
    return local
  }
  return digits
}

function limitNationalDigits(digits: string, country: Country): string {
  const stripped = stripLeadingCountryCode(digits, country)
  return stripped.slice(0, getMaxNationalDigits(country))
}

export function formatBrazilNational(digits: string): string {
  if (!digits) return ""
  const d = digits.slice(0, 11)
  if (d.length <= 2) return d.length === 2 ? `(${d})` : d

  const ddd = d.slice(0, 2)
  const rest = d.slice(2)
  if (!rest) return `(${ddd})`

  const isMobile = d.length > 10 || rest[0] === "9"
  if (isMobile) {
    if (rest.length <= 5) return `(${ddd}) ${rest}`
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
  }

  if (rest.length <= 4) return `(${ddd}) ${rest}`
  return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
}

function formatNationalDisplay(digits: string, country: Country): string {
  if (!digits) return ""
  if (country.code === "BR") return formatBrazilNational(digits)

  const code = country.code as CountryCode
  const e164 = `+${country.callingCode}${digits}`
  const parsed = parsePhoneNumberFromString(e164, code)
  if (parsed) return parsed.formatNational()

  const formatter = new AsYouType(code)
  const formatted = formatter.input(e164)
  const spaceIndex = formatted.indexOf(" ")
  return spaceIndex >= 0 ? formatted.slice(spaceIndex + 1) : digits
}

function buildE164(country: Country, nationalDigits: string): string {
  if (!nationalDigits) return ""
  const parsed = parsePhoneNumberFromString(`+${country.callingCode}${nationalDigits}`, country.code as CountryCode)
  return parsed?.format("E.164") ?? `+${country.callingCode}${nationalDigits}`
}

function parsePastedPhone(text: string, country: Country): string {
  const trimmed = text.trim()
  if (!trimmed) return ""

  const parsed = parsePhoneNumberFromString(trimmed)
  if (parsed?.country) {
    const parsedCountry = getCountryByCode(parsed.country)
    if (parsedCountry?.code === country.code) {
      return limitNationalDigits(parsed.nationalNumber, country)
    }
    if (parsedCountry) {
      return limitNationalDigits(parsed.nationalNumber, country)
    }
  }

  let digits = trimmed.replace(/\D/g, "")
  if (trimmed.startsWith("+") || digits.startsWith(country.callingCode)) {
    digits = stripLeadingCountryCode(digits, country)
  }
  return limitNationalDigits(digits, country)
}

export function formatPhoneDisplay(value: string): string {
  if (!value) return ""
  try {
    const parsed = parsePhoneNumberFromString(value.startsWith("+") ? value : `+${value.replace(/\D/g, "")}`)
    if (parsed?.country) {
      const country = getCountryByCode(parsed.country)
      if (country) {
        const national = formatNationalDisplay(parsed.nationalNumber, country)
        return `${country.emoji} +${parsed.countryCallingCode} ${national}`
      }
    }
  } catch {}
  return value
}

function validateBrazilNational(digits: string): string | null {
  if (digits.length === 10) return null
  if (digits.length === 11 && digits[2] === "9") return null
  return "Enter a valid phone number"
}

export function validatePhone(
  value: string,
  countryCode?: CountryCode | string,
  nationalDigits?: string,
): string | null {
  if (!value && !nationalDigits) return null

  if (countryCode === "BR" && nationalDigits !== undefined) {
    if (!nationalDigits) return null
    return validateBrazilNational(nationalDigits)
  }

  try {
    const valid = isValidPhoneNumber(value, countryCode as CountryCode | undefined)
    if (!valid) return "Enter a valid phone number"
  } catch {
    return "Enter a valid phone number"
  }
  return null
}

interface PhoneInputProps {
  value: string
  onChange: (e164: string) => void
  onPhoneChange?: (fields: PhoneFields) => void
  countryCode?: string
  onCountryChange?: (code: string) => void
  required?: boolean
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  id?: string
  name?: string
}

export default function PhoneInput({
  value,
  onChange,
  onPhoneChange,
  countryCode: initialCountryCode,
  onCountryChange,
  required,
  label,
  placeholder = "Phone number",
  error: externalError,
  disabled,
  id,
  name,
}: PhoneInputProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [nationalDigits, setNationalDigits] = useState("")
  const [internalError, setInternalError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedCountry = useMemo(() => {
    if (initialCountryCode) return getCountryByCode(initialCountryCode)
    if (value) {
      const { country } = parseE164(value)
      if (country) return country
    }
    return getCountryByCode("BR")
  }, [initialCountryCode, value])

  const displayValue = useMemo(() => {
    if (!selectedCountry || !nationalDigits) return ""
    return formatNationalDisplay(nationalDigits, selectedCountry)
  }, [nationalDigits, selectedCountry])

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return COUNTRIES
    const q = searchQuery.toLowerCase()
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.callingCode.includes(q) ||
        c.code.toLowerCase().includes(q),
    )
  }, [searchQuery])

  const emitChange = useCallback(
    (digits: string, country: Country) => {
      const e164 = buildE164(country, digits)
      onChange(e164)
      if (onPhoneChange && digits) {
        onPhoneChange({
          phone_country_code: `+${country.callingCode}`,
          phone_country: country.code,
          phone_number: digits,
          phone_e164: e164,
        })
      } else if (onPhoneChange && !digits) {
        onPhoneChange({
          phone_country_code: `+${country.callingCode}`,
          phone_country: country.code,
          phone_number: "",
          phone_e164: "",
        })
      }
    },
    [onChange, onPhoneChange],
  )

  const validate = useCallback(
    (digits: string, country: Country, onBlur = false) => {
      if (!digits) {
        setInternalError(onBlur && required ? "Enter a valid phone number" : null)
        return
      }
      if (country.code === "BR" && digits.length < 10 && !onBlur) {
        setInternalError(null)
        return
      }
      const e164 = buildE164(country, digits)
      const err = validatePhone(e164, country.code as CountryCode, digits)
      setInternalError(err)
    },
    [required],
  )

  useEffect(() => {
    if (!value) {
      setNationalDigits("")
      return
    }
    const { country, nationalNumber } = parseE164(value)
    const activeCountry = country ?? selectedCountry ?? getCountryByCode("BR")
    if (activeCountry) {
      setNationalDigits(limitNationalDigits(nationalNumber, activeCountry))
    }
  }, [value, selectedCountry])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearchQuery("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      searchRef.current.focus()
    }
  }, [dropdownOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCountry) return
    let rawDigits = e.target.value.replace(/\D/g, "")
    if (selectedCountry.code === "BR" && rawDigits.startsWith(selectedCountry.callingCode)) {
      rawDigits = stripLeadingCountryCode(rawDigits, selectedCountry)
    }
    const limited = limitNationalDigits(rawDigits, selectedCountry)
    setNationalDigits(limited)
    emitChange(limited, selectedCountry)
    validate(limited, selectedCountry)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    if (!selectedCountry) return
    const pasted = e.clipboardData.getData("text")
    const limited = parsePastedPhone(pasted, selectedCountry)
    setNationalDigits(limited)
    emitChange(limited, selectedCountry)
    validate(limited, selectedCountry)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !nationalDigits) return
    if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
      e.preventDefault()
    }
  }

  const handleCountrySelect = (country: Country) => {
    setDropdownOpen(false)
    setSearchQuery("")
    onCountryChange?.(country.code)

    const limited = limitNationalDigits(nationalDigits, country)
    setNationalDigits(limited)
    emitChange(limited, country)
    validate(limited, country)
  }

  const error = externalError || internalError

  return (
    <div ref={dropdownRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative flex">
        <button
          type="button"
          onClick={() => !disabled && setDropdownOpen(!dropdownOpen)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 rounded-l-xl border border-r-0 border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition-colors shrink-0",
            "hover:bg-white/[0.06] focus:border-blue-500/40",
            disabled && "opacity-50 cursor-not-allowed",
            dropdownOpen && "border-blue-500/40",
          )}
        >
          <span className="text-base leading-none">{selectedCountry?.emoji}</span>
          <span className="text-zinc-400 text-xs">+{selectedCountry?.callingCode}</span>
          <ChevronDown
            size={12}
            className={cn(
              "text-zinc-500 transition-transform duration-200",
              dropdownOpen && "rotate-180",
            )}
          />
        </button>

        <div className="relative flex-1">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="tel"
            inputMode="numeric"
            value={displayValue}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onBlur={() => selectedCountry && validate(nationalDigits, selectedCountry, true)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="tel-national"
            className={cn(
              "w-full rounded-r-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors",
              "focus:border-blue-500/40",
              disabled && "opacity-50 cursor-not-allowed",
              error && "border-red-500/40 focus:border-red-500/40",
            )}
          />
        </div>
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-1 z-50 w-full min-w-[280px] rounded-xl border border-white/[0.08] bg-[#0a0a0f]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="p-2 border-b border-white/[0.06]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search country..."
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] pl-8 pr-8 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
              {filteredCountries.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-zinc-600">
                  No countries found
                </div>
              ) : (
                filteredCountries.map((country) => {
                  const isSelected = country.code === selectedCountry?.code
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-blue-500/10 text-blue-300"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-white",
                      )}
                    >
                      <span className="text-base leading-none shrink-0">{country.emoji}</span>
                      <span className="flex-1 truncate">{country.name}</span>
                      <span className="text-xs text-zinc-600 shrink-0">+{country.callingCode}</span>
                      {isSelected && (
                        <Check size={14} className="text-blue-400 shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { COUNTRIES }
