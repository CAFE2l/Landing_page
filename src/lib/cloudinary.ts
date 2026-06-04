interface CloudinaryUploadResult {
  secure_url: string
  resource_type: "image" | "video" | "raw" | "auto"
  public_id: string
}

export const isCloudinaryConfigured = () =>
  Boolean(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)

export async function uploadToCloudinary(file: File, folder: string) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured.")
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", uploadPreset)
  formData.append("folder", folder)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error("Cloudinary upload failed.")
  }

  const data = (await response.json()) as CloudinaryUploadResult
  return data
}
