export type Currency = "BRL" | "USD" | "EUR"
export type Language = "pt-BR" | "en"
export type FeedbackApprovalMode = "manual" | "auto"
export type DigestFrequency = "daily" | "weekly" | "none"
export type MemberRole = "owner" | "admin" | "editor" | "viewer"
export type MemberStatus = "active" | "pending"
export type ActivityAction =
  | "login"
  | "settings_updated"
  | "member_invited"
  | "member_removed"
  | "member_role_changed"
  | "password_changed"
  | "settings_reset"
  | "data_exported"
  | "feedbacks_cleared"
  | "account_deleted"

export interface PhoneData {
  countryCode: string
  callingCode: string
  nationalNumber: string
  internationalNumber: string
  formattedNumber: string
}

export interface LocationData {
  city: string
  state: string
  country: string
  countryCode: string
  formattedAddress: string
  latitude: number | null
  longitude: number | null
  placeId: string
  source: "nominatim" | "viacep" | "manual"
  postalCode: string
}

export interface SiteSettings {
  siteName: string
  siteDescription: string
  logoUrl: string | null
  publicEmail: string
  whatsapp: string
  phoneData: PhoneData | null
  telegram: string
  discord: string
  location: string
  locationData: LocationData | null
  siteUrl: string
  currency: Currency
  language: Language
  timezone: string
  maxUploadMb: number
  feedbackApprovalMode: FeedbackApprovalMode
  emailNotificationsEnabled: boolean
  notifyNewFeedback: boolean
  notifyNewClient: boolean
  notifyNewOrder: boolean
  notifyPaymentReceived: boolean
  notifyProjectDelivered: boolean
  notificationEmail: string
  digestFrequency: DigestFrequency
  upfrontPercentage: number
  finalPaymentPercentage: number
  acceptedPaymentMethods: string[]
  paypalEmail: string
  stripePublishableKey: string
  stripeSecretKey: string
  pixKey: string
  browserPushEnabled: boolean
  whatsappNotificationsEnabled: boolean
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "CAFÉ Services",
  siteDescription: "Premium design and development services",
  logoUrl: null,
  publicEmail: "contato@cafeservices.com",
  whatsapp: "5541996713782",
  phoneData: {
    countryCode: "BR",
    callingCode: "55",
    nationalNumber: "41996713782",
    internationalNumber: "+5541996713782",
    formattedNumber: "+55 (41) 99671-3782",
  },
  telegram: "",
  discord: "",
  location: "Curitiba, Paraná, Brazil",
  locationData: {
    city: "Curitiba",
    state: "Paraná",
    country: "Brazil",
    countryCode: "BR",
    formattedAddress: "Curitiba, Paraná, Brazil",
    latitude: -25.4284,
    longitude: -49.2733,
    placeId: "",
    source: "manual",
    postalCode: "",
  },
  siteUrl: "https://cafeservices.com",
  currency: "BRL",
  language: "pt-BR",
  timezone: "America/Sao_Paulo",
  maxUploadMb: 10,
  feedbackApprovalMode: "manual",
  emailNotificationsEnabled: true,
  notifyNewFeedback: true,
  notifyNewClient: true,
  notifyNewOrder: true,
  notifyPaymentReceived: true,
  notifyProjectDelivered: true,
  notificationEmail: "admin@cafeservices.com",
  digestFrequency: "weekly",
  upfrontPercentage: 50,
  finalPaymentPercentage: 50,
  acceptedPaymentMethods: ["paypal", "pix", "wise"],
  paypalEmail: "",
  stripePublishableKey: "",
  stripeSecretKey: "",
  pixKey: "",
  browserPushEnabled: false,
  whatsappNotificationsEnabled: false,
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: MemberRole
  status: MemberStatus
  avatarUrl: string | null
  joinedAt: string
}

export interface ActivityLogEntry {
  id: string
  action: ActivityAction
  actor: string
  details: string
  timestamp: string
}

export interface AdminSession {
  id: string
  device: string
  browser: string
  location: string
  ip: string
  lastActive: string
  isCurrent: boolean
}

export interface SettingsValidationErrors {
  siteName?: string
  siteDescription?: string
  publicEmail?: string
  whatsapp?: string
  siteUrl?: string
  notificationEmail?: string
  maxUploadMb?: string
}

export function validateSettings(settings: Partial<SiteSettings>): SettingsValidationErrors {
  const errors: SettingsValidationErrors = {}

  if (settings.siteName !== undefined) {
    if (!settings.siteName.trim()) errors.siteName = "Site name is required"
    else if (settings.siteName.length < 2) errors.siteName = "Must be at least 2 characters"
    else if (settings.siteName.length > 100) errors.siteName = "Must be under 100 characters"
  }

  if (settings.siteDescription !== undefined && settings.siteDescription.length > 500) {
    errors.siteDescription = "Must be under 500 characters"
  }

  if (settings.publicEmail !== undefined) {
    if (!settings.publicEmail.trim()) errors.publicEmail = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.publicEmail)) errors.publicEmail = "Invalid email format"
  }

  if (settings.whatsapp !== undefined && settings.whatsapp.trim()) {
    const digits = settings.whatsapp.replace(/\D/g, "")
    if (digits.length < 10 || digits.length > 13) errors.whatsapp = "Invalid phone number"
  }

  if (settings.siteUrl !== undefined && settings.siteUrl.trim()) {
    try {
      new URL(settings.siteUrl.startsWith("http") ? settings.siteUrl : `https://${settings.siteUrl}`)
    } catch {
      errors.siteUrl = "Invalid URL"
    }
  }

  if (settings.notificationEmail !== undefined && settings.notificationEmail.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.notificationEmail)) {
      errors.notificationEmail = "Invalid email format"
    }
  }

  if (settings.maxUploadMb !== undefined) {
    if (settings.maxUploadMb < 1) errors.maxUploadMb = "Minimum is 1 MB"
    else if (settings.maxUploadMb > 100) errors.maxUploadMb = "Maximum is 100 MB"
  }

  return errors
}

export function hasSettingsErrors(errors: SettingsValidationErrors): boolean {
  return Object.keys(errors).length > 0
}
