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

  const usernameQuery = query(collection(db, "users"), where("username", "==", normalized), limit(1))
  const snapshot = await getDocs(usernameQuery)
  const existing = snapshot.docs[0]
  const available = !existing || existing.id === currentUid

  return {
    available,
    message: available ? "Username available" : "Username already taken",
    username: normalized,
  }
}

export const saveUserProfile = async (user: UserProfile) => {
  if (!db || !user.uid) return

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      name: user.name,
      email: user.email,
      username: user.username || "",
      role: user.role,
      company: user.company || "",
      photoUrl: user.photoUrl || "",
      updatedAt: serverTimestamp(),
      createdAt: user.createdAt || serverTimestamp(),
    },
    { merge: true },
  )
}

export const listUsers = async () => {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")))
  return snapshot.docs.map(mapUser)
}

export const listFeedbacks = async () => {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, "feedbacks"), orderBy("createdAt", "desc")))
  return snapshot.docs.map(mapFeedback)
}

export const listPublicFeedbacks = async () => {
  if (!db) return []
  const snapshot = await getDocs(
    query(
      collection(db, "feedbacks"),
      where("status", "==", "approved"),
      where("showOnPublicPage", "==", true),
    ),
  )
  return snapshot.docs.map(mapFeedback).sort((a, b) => (a.order || 0) - (b.order || 0))
}

export const createFeedback = async (feedback: FeedbackEntry) => {
  if (!db) return
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
}

export const updateUserRole = async (uid: string, role: UserRole) => {
  if (!db) return
  await updateDoc(doc(db, "users", uid), { role, updatedAt: serverTimestamp() })
}

export const deleteUserProfile = async (uid: string) => {
  if (!db) return
  await deleteDoc(doc(db, "users", uid))
}

export const updateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
  if (!db) return
  await updateDoc(doc(db, "feedbacks", id), {
    status,
    approved: status === "approved",
    updatedAt: serverTimestamp(),
  })
}

export const deleteFeedbackEntry = async (id: string) => {
  if (!db) return
  await deleteDoc(doc(db, "feedbacks", id))
}

export const updateTestimonialVisibility = async (id: string, showOnPublicPage: boolean) => {
  if (!db) return
  await updateDoc(doc(db, "feedbacks", id), {
    showOnPublicPage,
    updatedAt: serverTimestamp(),
  })
}

export const updateTestimonialOrder = async (id: string, order: number) => {
  if (!db) return
  await updateDoc(doc(db, "feedbacks", id), {
    order,
    updatedAt: serverTimestamp(),
  })
}
