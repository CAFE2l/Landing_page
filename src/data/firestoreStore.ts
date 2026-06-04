import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { db } from "../lib/firebase"
import { supabase, supabaseConfigured } from "../lib/supabase/client"
import type { FeedbackEntry, UserProfile, UserRole } from "./feedbackStore"

export type FeedbackStatus = "pending" | "approved" | "rejected"

export const normalizeUsername = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 20)

export const isValidUsername = (value: string) => /^[a-z0-9_.-]{3,20}$/.test(value)

const toIsoDate = (value: unknown) => {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString()
  }

  if (typeof value === "string") return value
  return new Date().toISOString()
}

const readString = (data: DocumentData, key: string, fallback = "") => {
  const value = data[key]
  return typeof value === "string" ? value : fallback
}

const readNumber = (data: DocumentData, key: string, fallback = 0) => {
  const value = data[key]
  return typeof value === "number" ? value : fallback
}

const readBoolean = (data: DocumentData, key: string, fallback = false) => {
  const value = data[key]
  return typeof value === "boolean" ? value : fallback
}

const mapUser = (snapshot: QueryDocumentSnapshot<DocumentData>): UserProfile => {
  const data = snapshot.data()
  const roleValue = readString(data, "role", "client").toLowerCase()
  const role: UserRole = roleValue === "admin" ? "admin" : "client"

  return {
    uid: readString(data, "uid", snapshot.id),
    name: readString(data, "name", "Client"),
    email: readString(data, "email"),
    username: readString(data, "username"),
    role,
    company: readString(data, "company") || undefined,
    country: readString(data, "country") || undefined,
    photoUrl: readString(data, "photoUrl") || undefined,
    createdAt: toIsoDate(data.createdAt),
  }
}

const mapFeedback = (snapshot: QueryDocumentSnapshot<DocumentData>): FeedbackEntry => {
  const data = snapshot.data()
  const statusValue = readString(data, "status", readBoolean(data, "approved") ? "approved" : "pending")
  const status: FeedbackStatus =
    statusValue === "approved" || statusValue === "rejected" || statusValue === "pending" ? statusValue : "pending"

  return {
    id: snapshot.id,
    quote: readString(data, "quote"),
    name: readString(data, "name", "Client"),
    role: readString(data, "role", "Client"),
    company: readString(data, "company", "CAFÉ SERVICES Client"),
    flag: readString(data, "flag", "Global"),
    initials: readString(data, "initials", "CS"),
    rating: readNumber(data, "rating", 5),
    project: readString(data, "project") || undefined,
    result: readString(data, "result") || undefined,
    mediaType: readString(data, "mediaType") === "video" ? "video" : "image",
    mediaUrl: readString(data, "mediaUrl") || undefined,
    approved: status === "approved",
    status,
    userId: readString(data, "userId") || undefined,
    username: readString(data, "username") || undefined,
    showOnPublicPage: readBoolean(data, "showOnPublicPage", status === "approved"),
    order: readNumber(data, "order", 0),
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
  }
}

export const checkUsernameAvailability = async (username: string, currentUid?: string) => {
  const normalized = normalizeUsername(username)

  if (!isValidUsername(normalized)) {
    return { available: false, message: "Invalid format", username: normalized }
  }

  if (!db) {
    return { available: false, message: "Firebase is not configured", username: normalized }
  }

  try {
    const usernameQuery = query(collection(db, "users"), where("username", "==", normalized), limit(1))
    const snapshot = await getDocs(usernameQuery)
    const existing = snapshot.docs[0]
    const available = !existing || existing.id === currentUid

    return {
      available,
      message: available ? "Username available" : "Username already taken",
      username: normalized,
    }
  } catch {
    return { available: false, message: "Unable to verify username", username: normalized }
  }
}

export const saveUserProfile = async (user: UserProfile) => {
  if (!db || !user.uid) return

  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        name: user.name,
        email: user.email,
        username: user.username || "",
        role: user.role,
        company: user.company || "",
        country: user.country || "",
        photoUrl: user.photoUrl || "",
        updatedAt: serverTimestamp(),
        createdAt: user.createdAt || serverTimestamp(),
      },
      { merge: true },
    )
  } catch {
    // Silently fail — Firestore may not be configured or permissions may be denied
  }
}

export const listUsers = async () => {
  if (!db) return []
  try {
    const snapshot = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")))
    return snapshot.docs.map(mapUser)
  } catch {
    return []
  }
}

export const listFeedbacks = async () => {
  if (!db) return []
  try {
    const snapshot = await getDocs(query(collection(db, "feedbacks"), orderBy("createdAt", "desc")))
    return snapshot.docs.map(mapFeedback)
  } catch {
    return []
  }
}

export const listUserFeedbacks = async (userId: string) => {
  if (!db) return []
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "feedbacks"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
      ),
    )
    return snapshot.docs.map(mapFeedback)
  } catch {
    return []
  }
}

export const listPublicFeedbacks = async () => {
  if (!db) return []
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "feedbacks"),
        where("status", "==", "approved"),
        where("showOnPublicPage", "==", true),
      ),
    )
    return snapshot.docs.map(mapFeedback).sort((a, b) => (a.order || 0) - (b.order || 0))
  } catch {
    return []
  }
}

export const createFeedback = async (feedback: FeedbackEntry) => {
  if (!db) return
  try {
    const feedbackRef = doc(collection(db, "feedbacks"))

    await setDoc(feedbackRef, {
      ...feedback,
      id: feedbackRef.id,
      status: feedback.status || "pending",
      approved: feedback.status === "approved" || feedback.approved === true,
      showOnPublicPage: feedback.showOnPublicPage || false,
      order: feedback.order || Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch {
    // Silently fail
  }
}

export const updateUserRole = async (uid: string, role: UserRole) => {
  if (!db) return
  try {
    await updateDoc(doc(db, "users", uid), { role, updatedAt: serverTimestamp() })
  } catch {
    // Silently fail
  }
}

export const deleteUserProfile = async (uid: string) => {
  if (!db) return
  try {
    await deleteDoc(doc(db, "users", uid))
  } catch {
    // Silently fail
  }
}

export const updateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
  if (!db) return
  try {
    await updateDoc(doc(db, "feedbacks", id), {
      status,
      approved: status === "approved",
      updatedAt: serverTimestamp(),
    })
  } catch {
    // Silently fail
  }
}

export const deleteFeedbackEntry = async (id: string) => {
  if (!db) return
  try {
    await deleteDoc(doc(db, "feedbacks", id))
  } catch {
    // Silently fail
  }
}

export const updateTestimonialVisibility = async (id: string, showOnPublicPage: boolean) => {
  if (!db) return
  try {
    await updateDoc(doc(db, "feedbacks", id), {
      showOnPublicPage,
      updatedAt: serverTimestamp(),
    })
  } catch {
    // Silently fail
  }
}

export const updateTestimonialOrder = async (id: string, order: number) => {
  if (!db) return
  try {
    await updateDoc(doc(db, "feedbacks", id), {
      order,
      updatedAt: serverTimestamp(),
    })
  } catch {
    // Silently fail
  }
}

export const countUsers = async (): Promise<number> => {
  if (supabase && supabaseConfigured) {
    try {
      const { count, error } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
      if (!error && count !== null) return count
    } catch {
      // Fall through to Firestore
    }
  }

  if (!db) return 0
  try {
    const snapshot = await getDocs(collection(db, "users"))
    return snapshot.size
  } catch {
    return 0
  }
}

export const countProjects = async (): Promise<number> => {
  if (!db) return 0
  try {
    const snapshot = await getDocs(
      query(collection(db, "feedbacks"), where("status", "in", ["approved", "completed", "done"])),
    )
    return snapshot.size
  } catch {
    return 0
  }
}

export const countCountries = async (): Promise<number> => {
  if (supabase && supabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("country")
        .not("country", "is", null)

      if (!error && data) {
        const countries = new Set<string>()
        data.forEach((row) => {
          if (row.country && typeof row.country === "string" && row.country.trim())
            countries.add(row.country.trim().toLowerCase())
        })
        return countries.size
      }
    } catch {
      // Fall through to Firestore
    }
  }

  if (!db) return 0
  try {
    const snapshot = await getDocs(collection(db, "users"))
    const countries = new Set<string>()
    snapshot.docs.forEach((d) => {
      const c = d.data().country
      if (c && typeof c === "string" && c.trim()) countries.add(c.trim().toLowerCase())
    })
    return countries.size
  } catch {
    return 0
  }
}
