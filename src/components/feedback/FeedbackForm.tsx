import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  Star,
  Link as LinkIcon,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader,
} from "lucide-react";
import {
  SERVICE_CATEGORIES,
  type FeedbackMedia,
  type ServiceCategory,
} from "../../data/feedbackStore";
import { uploadFeedbackMedia } from "../../lib/cloudinary";

interface FeedbackFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FeedbackFormData) => void;
  isSubmitting?: boolean;
}

export interface FeedbackFormData {
  serviceCategory: ServiceCategory;
  projectTitle: string;
  projectUrl: string;
  rating: number;
  title: string;
  content: string;
  media: FeedbackMedia[];
  serviceDate: string;
  improvementSuggestion: string;
}

interface MediaUploadState {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export default function FeedbackForm({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: FeedbackFormProps) {
  const [step, setStep] = useState(0);
  const [serviceCategory, setServiceCategory] =
    useState<ServiceCategory>("Landing Page");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [improvementSuggestion, setImprovementSuggestion] = useState("");
  const [media, setMedia] = useState<FeedbackMedia[]>([]);
  const [uploadStates, setUploadStates] = useState<
    Map<string, MediaUploadState>
  >(new Map());
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadIdRef = useRef(0);

  const reset = () => {
    setStep(0);
    setServiceCategory("Landing Page");
    setProjectTitle("");
    setProjectUrl("");
    setRating(0);
    setHoverRating(0);
    setTitle("");
    setContent("");
    setServiceDate("");
    setImprovementSuggestion("");
    setMedia([]);
    setUploadStates(new Map());
    setUploadError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFiles = async (files: FileList | File[]) => {
    setUploadError("");
    const arr = Array.from(files);

    for (const f of arr) {
      if (f.size > MAX_FILE_SIZE) {
        setUploadError(`File too large: ${f.name} (max 50MB)`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(f.type)) {
        setUploadError(`Unsupported type: ${f.name}`);
        continue;
      }

      const type = f.type.startsWith("video/") ? "video" : "image";
      const preview = URL.createObjectURL(f);
      uploadIdRef.current += 1;
      const id = `${f.name}-${f.lastModified}-${uploadIdRef.current}`;

      // Add to upload states
      const uploadState: MediaUploadState = {
        id,
        file: f,
        preview,
        type,
        progress: 0,
        status: "pending",
      };

      setUploadStates((prev) => new Map(prev).set(id, uploadState));

      // Start upload
      uploadToCloudinary(id, f, type);
    }
  };

  const uploadToCloudinary = async (
    id: string,
    file: File,
    type: "image" | "video",
  ) => {
    try {
      // Update status to uploading
      setUploadStates((prev) => {
        const map = new Map(prev);
        const state = map.get(id)!;
        map.set(id, { ...state, status: "uploading" });
        return map;
      });

      // Upload file
      const result = await uploadFeedbackMedia(file, (progress) => {
        setUploadStates((prev) => {
          const map = new Map(prev);
          const state = map.get(id)!;
          map.set(id, { ...state, progress });
          return map;
        });
      });

      // Add to media list
      setMedia((prev) => [
        ...prev,
        {
          url: result.secure_url,
          type,
          altText: file.name,
        },
      ]);

      // Update status to done
      setUploadStates((prev) => {
        const map = new Map(prev);
        const state = map.get(id)!;
        map.set(id, { ...state, status: "done" });
        return map;
      });

      // Remove from upload states after success (auto-cleanup)
      setTimeout(() => {
        setUploadStates((prev) => {
          const map = new Map(prev);
          map.delete(id);
          return map;
        });
      }, 500); // Show success state for 500ms
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Upload failed";
      setUploadStates((prev) => {
        const map = new Map(prev);
        const state = map.get(id)!;
        map.set(id, { ...state, status: "error", error: errorMsg });
        return map;
      });
      setUploadError(errorMsg);

      // Remove from upload states after error (auto-cleanup)
      setTimeout(() => {
        setUploadStates((prev) => {
          const map = new Map(prev);
          map.delete(id);
          return map;
        });
      }, 2000); // Show error state for 2s
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const removeUpload = (id: string) => {
    setUploadStates((prev) => {
      const map = new Map(prev);
      map.delete(id);
      return map;
    });
  };

  const canProceed = () => {
    if (step === 0)
      return rating > 0 && title.trim().length > 0 && content.trim().length > 0;
    return true;
  };

  const handleSubmit = () => {
    onSubmit({
      serviceCategory,
      projectTitle: projectTitle.trim(),
      projectUrl: projectUrl.trim(),
      rating,
      title: title.trim(),
      content: content.trim(),
      media,
      serviceDate,
      improvementSuggestion: improvementSuggestion.trim(),
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/[0.08] bg-[#0A0A0F] p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-[#6B6B80] hover:text-[#F0F0F5] hover:bg-white/[0.04] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F6EF7]/10 text-[#4F6EF7]">
                <Send size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#F0F0F5]">
                  Share Your Feedback
                </h2>
                <p className="text-xs text-[#6B6B80]">Step {step + 1} of 2</p>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-[#4F6EF7]" : "bg-[#1E1E2A]"}`}
                />
              ))}
            </div>

            {step === 0 && (
              <div className="space-y-5">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-[#F0F0F5] mb-2">
                    Rating *
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(n)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          size={28}
                          className={`transition-colors ${
                            n <= (hoverRating || rating)
                              ? "text-[#F59E0B] fill-[#F59E0B]"
                              : "text-[#3A3A4A]"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-[#F0F0F5] mb-2">
                    Feedback Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g., Amazing landing page redesign"
                    maxLength={200}
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-[#F0F0F5] mb-2">
                    Your Feedback *
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Describe your experience with the service..."
                    rows={5}
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-3 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all resize-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-[#F0F0F5] mb-2">
                    Service Category *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SERVICE_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setServiceCategory(cat)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          serviceCategory === cat
                            ? "bg-[#4F6EF7]/15 border border-[#4F6EF7]/30 text-[#4F6EF7]"
                            : "bg-[#0A0A0F] border border-[#1E1E2A] text-[#6B6B80] hover:border-[#4F6EF7]/20 hover:text-[#F0F0F5]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project Title */}
                <div>
                  <label className="block text-sm font-medium text-[#F0F0F5] mb-2">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="E.g., E-commerce Dashboard"
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                  />
                </div>

                {/* Project URL */}
                <div>
                  <label className="block text-sm font-medium text-[#F0F0F5] mb-2">
                    Project URL
                  </label>
                  <div className="relative">
                    <LinkIcon
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B80]"
                    />
                    <input
                      type="url"
                      value={projectUrl}
                      onChange={(e) => setProjectUrl(e.target.value)}
                      placeholder="https://seusite.com/projeto"
                      className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                    />
                  </div>
                </div>

                {/* Service Date */}
                <div>
                  <label className="block text-sm font-medium text-[#F0F0F5] mb-2">
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#6B6B80] hover:text-[#F0F0F5] border border-[#1E1E2A] hover:bg-white/[0.04] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => canProceed() && setStep(1)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      canProceed()
                        ? "bg-[#4F6EF7] text-white hover:bg-[#6B85FF] shadow-[0_0_20px_rgba(79,110,247,0.15)]"
                        : "bg-[#1E1E2A] text-[#6B6B80] cursor-not-allowed"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                {/* Media Upload */}
                <div>
                  <label className="block text-sm font-medium text-[#F0F0F5] mb-2">
                    Photos & Videos
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 ${
                      dragOver
                        ? "border-[#4F6EF7] bg-[#4F6EF7]/5"
                        : "border-[#1E1E2A] hover:border-[#4F6EF7]/30"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files && handleFiles(e.target.files)
                      }
                    />
                    <Upload
                      size={24}
                      className={`mx-auto mb-2 ${dragOver ? "text-[#4F6EF7]" : "text-[#6B6B80]"}`}
                    />
                    <p className="text-sm text-[#6B6B80]">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#4F6EF7] hover:text-[#6B85FF] transition-colors font-medium"
                      >
                        Click to upload
                      </button>{" "}
                      or drag and drop
                    </p>
                    <p className="text-[10px] text-[#6B6B80] mt-1">
                      JPG, PNG, GIF, WebP, MP4 up to 50MB
                    </p>
                  </div>

                  {/* Upload errors */}
                  {uploadError && (
                    <div className="flex items-center gap-2 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <AlertCircle
                        size={16}
                        className="text-red-400 flex-shrink-0"
                      />
                      <p className="text-xs text-red-400">{uploadError}</p>
                    </div>
                  )}

                  {/* Upload states */}
                  {uploadStates.size > 0 && (
                    <div className="mt-3 space-y-2">
                      {Array.from(uploadStates.values()).map((state) => (
                        <div
                          key={state.id}
                          className="p-3 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {state.status === "uploading" && (
                                <Loader
                                  size={14}
                                  className="text-[#4F6EF7] animate-spin flex-shrink-0"
                                />
                              )}
                              {state.status === "done" && (
                                <CheckCircle2
                                  size={14}
                                  className="text-green-400 flex-shrink-0"
                                />
                              )}
                              {state.status === "error" && (
                                <AlertCircle
                                  size={14}
                                  className="text-red-400 flex-shrink-0"
                                />
                              )}
                              <span className="text-xs text-[#6B6B80] truncate">
                                {state.file.name}
                              </span>
                            </div>
                            {state.status !== "done" && (
                              <button
                                type="button"
                                onClick={() => removeUpload(state.id)}
                                className="ml-2 p-1 text-[#6B6B80] hover:text-red-400 transition-colors flex-shrink-0"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                          {state.status === "uploading" && (
                            <div className="w-full bg-[#1E1E2A] rounded-full h-1 overflow-hidden">
                              <div
                                className="bg-[#4F6EF7] h-full rounded-full transition-all duration-300"
                                style={{ width: `${state.progress}%` }}
                              />
                            </div>
                          )}
                          {state.status === "error" && (
                            <p className="text-[10px] text-red-400">
                              {state.error}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Uploaded media preview */}
                  {media.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-[#6B6B80] mb-2">
                        Uploaded: {media.length}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {media.map((m, i) => (
                          <div
                            key={i}
                            className="relative group rounded-xl overflow-hidden border border-[#1E1E2A] aspect-square"
                          >
                            {m.type === "image" ? (
                              <img
                                src={m.url}
                                alt={m.altText || ""}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={m.url}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => removeMedia(i)}
                              className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Improvement Suggestion */}
                <div>
                  <label className="block text-sm font-medium text-[#F0F0F5] mb-2">
                    Improvement Suggestions (optional)
                  </label>
                  <textarea
                    value={improvementSuggestion}
                    onChange={(e) => setImprovementSuggestion(e.target.value)}
                    placeholder="Any suggestions for improvement?"
                    rows={3}
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-3 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#6B6B80] hover:text-[#F0F0F5] border border-[#1E1E2A] hover:bg-white/[0.04] transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || uploadStates.size > 0}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#4F6EF7] text-white hover:bg-[#6B85FF] shadow-[0_0_20px_rgba(79,110,247,0.15)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : uploadStates.size > 0
                        ? "Uploading..."
                        : "Submit Feedback"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
