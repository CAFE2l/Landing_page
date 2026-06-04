import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import type { UserProfile, UserRole } from "../data/feedbackStore"
import { db } from "./firebase"

const isRole = (role: unknown): role is UserRole => role === "admin" || role === "client"

interface ResolveUserProfileInput {
  uid: string
  email: string
  name: string
  username?: string
  company?: string
  country?: string
  photoUrl?: string
}

export async function resolveUserProfile({
  uid,
  email,
  name,
  username,
  company,
  country,
  photoUrl,
}: ResolveUserProfileInput): Promise<UserProfile> {
  if (!db) {
    return {
      uid,
      name,
      email,
      role: "client",
      username,
      company,
      country,
      photoUrl,
    }
  }

  try {
    const userRef = doc(db, "users", uid)
    const snapshot = await getDoc(userRef)

    if (!snapshot.exists()) {
      const profile: UserProfile = {
        uid,
        name,
        email,
        role: "client",
        username,
        company,
        country,
        photoUrl,
      }

      await setDoc(userRef, {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      return profile
    }

    const data = snapshot.data()
    const role = isRole(data.role) ? data.role : "client"

    await setDoc(
      userRef,
      {
        name: data.name || name,
        email: data.email || email,
        username: data.username || username || "",
        company: data.company || company || null,
        country: data.country || country || "",
        photoUrl: data.photoUrl || photoUrl || null,
        role,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    return {
      uid,
      name: String(data.name || name),
      email: String(data.email || email),
      role,
      username: typeof data.username === "string" ? data.username : username,
      company: typeof data.company === "string" ? data.company : company,
      country: typeof data.country === "string" ? data.country : country,
      photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : photoUrl,
    }
  } catch {
    return {
      uid,
      name,
      email,
      role: "client",
      username,
      company,
      country,
      photoUrl,
    }
  }
}
