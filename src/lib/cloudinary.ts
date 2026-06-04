export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  width: number
  height: number
}

export const isCloudinaryConfigured = () =>
  Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET)

export async function uploadToCloudinary(
  file: File,
  folder = "avatars"
): Promise<CloudinaryUploadResult> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured.")
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
  formData.append("folder", folder)
  formData.append("eager", "c_fill,g_face,h_200,w_200,q_auto,f_auto")
  formData.append("eager_async", "false")

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Upload failed")
  }

  return response.json()
}

export function getAvatarUrl(publicId: string, size = 200): string {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,g_face,h_${size},w_${size},q_auto,f_auto/${publicId}`
}
