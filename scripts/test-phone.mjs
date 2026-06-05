import { parsePhoneNumberFromString } from "libphonenumber-js"

const MAX_NATIONAL_DIGITS = { BR: 11 }

function getMaxNationalDigits(country) {
  return MAX_NATIONAL_DIGITS[country.code] ?? 15
}

function stripLeadingCountryCode(digits, country) {
  const cc = country.callingCode
  const maxLen = getMaxNationalDigits(country)
  if (!digits.startsWith(cc)) return digits
  const local = digits.slice(cc.length)
  if (country.code === "BR") {
    return local.length <= maxLen ? local : local.slice(0, maxLen)
  }
  if (digits.length > maxLen) return local
  return digits
}

function limitNationalDigits(digits, country) {
  const stripped = stripLeadingCountryCode(digits, country)
  return stripped.slice(0, getMaxNationalDigits(country))
}

function formatBrazilNational(digits) {
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

function buildE164(country, nationalDigits) {
  if (!nationalDigits) return ""
  const parsed = parsePhoneNumberFromString(`+${country.callingCode}${nationalDigits}`, country.code)
  return parsed?.format("E.164") ?? `+${country.callingCode}${nationalDigits}`
}

const BR = { code: "BR", callingCode: "55" }

const tests = [
  {
    name: "Digitar 41996713782 → (41) 99671-3782",
    input: "41996713782",
    expectDisplay: "(41) 99671-3782",
    expectE164: "+5541996713782",
    expectNational: "41996713782",
  },
  {
    name: "Colar +55 (41) 99671-3782 → local correto",
    input: "+55 (41) 99671-3782",
    expectDisplay: "(41) 99671-3782",
    expectE164: "+5541996713782",
    expectNational: "41996713782",
  },
  {
    name: "Digitar 4 não deve mostrar (55)",
    input: "4",
    expectDisplay: "4",
    expectE164: "+554",
    expectNational: "4",
  },
  {
    name: "10 dígitos fixo",
    input: "4133333333",
    expectDisplay: "(41) 3333-3333",
    expectE164: "+554133333333",
    expectNational: "4133333333",
  },
]

let passed = 0
let failed = 0

for (const t of tests) {
  const digits = limitNationalDigits(t.input.replace(/\D/g, ""), BR)
  const display = formatBrazilNational(digits)
  const e164 = buildE164(BR, digits)

  const ok =
    display === t.expectDisplay &&
    e164 === t.expectE164 &&
    digits === t.expectNational

  if (ok) {
    console.log(`✓ ${t.name}`)
    passed++
  } else {
    console.log(`✗ ${t.name}`)
    console.log(`  display: ${display} (expected ${t.expectDisplay})`)
    console.log(`  e164: ${e164} (expected ${t.expectE164})`)
    console.log(`  national: ${digits} (expected ${t.expectNational})`)
    failed++
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
