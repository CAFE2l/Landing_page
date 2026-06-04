import { useState, useRef, useCallback } from "react"
import { Camera, Loader2, AlertCircle } from "lucide-react"
import { uploadToCloudinary, isCloudinaryConfigured } from "../../lib/cloudinary"
import { supabase } from "../../lib/supabase/client"
import { useAuth } from "../../contexts/AuthContext"
import { saveCurrentUser, loadCurrentUser } from "../../data/feedbackStore"

interface AvatarUploadProps {
  currentAvatarUrl?: string
  onUploadComplete: (url: string) => void
}

export function AvatarUpload({ currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10MB")
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setError(null)
    setUploading(true)
    setProgress(30)

    try {
      if (!isCloudinaryConfigured()) {
        throw new Error("Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env")
      }

      setProgress(50)
      const result = await uploadToCloudinary(file, "avatars")
      setProgress(80)

      if (user && supabase) {
        const { error: dbError } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            avatar_url: result.secure_url,
            avatar_public_id: result.public_id,
            updated_at: new Date().toISOString(),
          })
          if (dbError) {
            console.warn("[AvatarUpload] Supabase profile save failed:", dbError.message)
          }
      }

      const localUser = loadCurrentUser()
      if (localUser) {
        saveCurrentUser({ ...localUser, photoUrl: result.secure_url })
      }

      setProgress(100)
      onUploadComplete(result.secure_url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setPreview(null)
    } finally {
      setUploading(false)
      URL.revokeObjectURL(objectUrl)
    }
  }, [user, onUploadComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const displayUrl = preview || currentAvatarUrl

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#4f6ef7]/40 transition-colors hover:border-[#4f6ef7]"
      >
        {displayUrl ? (
          <img src={displayUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <Camera size={28} className="text-[#6b6b80]" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <Loader2 size={20} className="mx-auto animate-spin text-white" />
              <span className="text-xs text-white">{progress}%</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      <p className="text-[10px] text-[#6b6b80]">
        Click or drag to upload · Max 10MB
      </p>
    </div>
  )
}
