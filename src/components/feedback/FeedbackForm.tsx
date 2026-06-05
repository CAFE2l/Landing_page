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
  ChevronRight,
  ChevronLeft,
  Calendar,
  Type,
  FileText,
  MousePointer2,
  Play,
  Image as ImageIcon,
} from "lucide-react";
import {
  SERVICE_CATEGORIES,
  type FeedbackMedia,
  type ServiceCategory,
} from "../../data/feedbackStore";
import { uploadFeedbackMedia } from "../../lib/cloudinary";
import { useUserProfile } from "../../hooks/useUserProfile";
import { cn } from "../../lib/utils";

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
  const { profile } = useUserProfile();
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
    if ((title || content || rating > 0) && !isSubmitting) {
      if (
        confirm("You have unsaved changes. Are you sure you want to close?")
      ) {
        reset();
        onClose();
      }
    } else {
      reset();
      onClose();
    }
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

      const uploadState: MediaUploadState = {
        id,
        file: f,
        preview,
        type,
        progress: 0,
        status: "pending",
      };

      setUploadStates((prev) => new Map(prev).set(id, uploadState));
      uploadToCloudinary(id, f, type);
    }
  };

  const uploadToCloudinary = async (
    id: string,
    file: File,
    type: "image" | "video",
  ) => {
    try {
      setUploadStates((prev) => {
        const map = new Map(prev);
        const state = map.get(id)!;
        map.set(id, { ...state, status: "uploading" });
        return map;
      });

      const result = await uploadFeedbackMedia(file, (progress) => {
        setUploadStates((prev) => {
          const map = new Map(prev);
          const state = map.get(id)!;
          map.set(id, { ...state, progress });
          return map;
        });
      });

      setMedia((prev) => [
        ...prev,
        {
          url: result.secure_url,
          type,
          altText: file.name,
        },
      ]);

      setUploadStates((prev) => {
        const map = new Map(prev);
        const state = map.get(id)!;
        map.set(id, { ...state, status: "done" });
        return map;
      });

      setTimeout(() => {
        setUploadStates((prev) => {
          const map = new Map(prev);
          map.delete(id);
          return map;
        });
      }, 500);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Upload failed";
      setUploadStates((prev) => {
        const map = new Map(prev);
        const state = map.get(id)!;
        map.set(id, { ...state, status: "error", error: errorMsg });
        return map;
      });
      setUploadError(errorMsg);
      setTimeout(() => {
        setUploadStates((prev) => {
          const map = new Map(prev);
          map.delete(id);
          return map;
        });
      }, 2000);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#020408]/80 backdrop-blur-md"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-white/[0.08] bg-[#0A0A0F] shadow-[0_32px_120px_rgba(0,0,0,0.6)] scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Banner */}
            <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-[#4F6EF7]/20 via-[#6B85FF]/10 to-transparent">
              <div className="absolute inset-0 opacity-[0.05] [background-image:url('data:image/svg+xml,%3Csvg_viewBox=%220_0_200_200%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.85%22_numOctaves=%223%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22200%22_height=%22200%22_filter=%22url(%23n)%22_opacity=%220.45%22/%3E%3C/svg%3E')]" />
              <div className="absolute -bottom-6 left-8 flex items-end gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.12] bg-[#0A0A0F] p-1.5 shadow-2xl">
                  <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#4F6EF7] to-[#6B85FF] text-white">
                    <Star size={24} className="fill-current" />
                  </div>
                </div>
                <div className="pb-8">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Share Your Experience
                  </h2>
                  <p className="text-xs text-white/40">
                    Step {step + 1} of 2 •{" "}
                    {step === 0 ? "Details" : "Media & Proof"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-[#0A0A0F]/40 text-white/40 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 pt-10">
              {/* Progress bar */}
              <div className="relative mb-10 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                <motion.div
                  initial={{ width: "50%" }}
                  animate={{ width: step === 0 ? "50%" : "100%" }}
                  className="h-full bg-gradient-to-r from-[#4F6EF7] to-[#6B85FF]"
                />
              </div>

              <AnimatePresence mode="wait">
                {step === 0 ? (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8"
                  >
                    {/* User Identity Preview */}
                    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-white/[0.1] bg-gradient-to-br from-[#4F6EF7]/20 to-[#6B85FF]/20">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#4F6EF7]">
                            {profile?.initials}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {profile?.full_name}
                        </p>
                        <p className="text-xs text-white/40">
                          Posting as {profile?.role || "client"}
                        </p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    </div>

                    {/* Rating Section */}
                    <div className="text-center sm:text-left">
                      <label className="mb-4 block text-sm font-medium text-white/60 tracking-wider uppercase text-[10px]">
                        How would you rate our service?
                      </label>
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onMouseEnter={() => setHoverRating(n)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(n)}
                            className="relative group p-1"
                          >
                            <motion.div
                              animate={{
                                scale: n <= (hoverRating || rating) ? 1.15 : 1,
                                filter:
                                  n <= (hoverRating || rating)
                                    ? "drop-shadow(0 0 8px rgba(245,158,11,0.4))"
                                    : "none",
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 17,
                              }}
                            >
                              <Star
                                size={36}
                                className={cn(
                                  "transition-colors duration-300",
                                  n <= (hoverRating || rating)
                                    ? "text-[#F59E0B] fill-[#F59E0B]"
                                    : "text-white/[0.08]",
                                )}
                              />
                            </motion.div>
                          </button>
                        ))}
                        {rating > 0 && (
                          <motion.span
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="ml-4 text-lg font-bold text-[#F59E0B]"
                          >
                            {rating}/5
                          </motion.span>
                        )}
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                          <Type size={12} /> Feedback Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Summarize your experience..."
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-3.5 text-sm text-white placeholder:text-white/10 outline-none focus:border-[#4F6EF7]/50 focus:bg-white/[0.05] transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                            <FileText size={12} /> Detailed Feedback
                          </label>
                          <span
                            className={cn(
                              "text-[10px] font-medium",
                              content.length > 500
                                ? "text-red-400"
                                : "text-white/20",
                            )}
                          >
                            {content.length}/500
                          </span>
                        </div>
                        <textarea
                          value={content}
                          onChange={(e) =>
                            setContent(e.target.value.slice(0, 500))
                          }
                          placeholder="What did you like? What can we improve?"
                          rows={4}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-sm text-white placeholder:text-white/10 outline-none focus:border-[#4F6EF7]/50 focus:bg-white/[0.05] transition-all resize-none"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                          <MousePointer2 size={12} /> Service Category
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {SERVICE_CATEGORIES.map((cat) => {
                            const active = serviceCategory === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setServiceCategory(cat)}
                                className={cn(
                                  "group relative overflow-hidden px-3 py-3.5 rounded-xl text-[10px] font-bold transition-all border",
                                  active
                                    ? "bg-[#4F6EF7] border-[#4F6EF7] text-white shadow-[0_8px_20px_rgba(79,110,247,0.25)]"
                                    : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white/70",
                                )}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                          <Type size={12} /> Project Title
                        </label>
                        <input
                          type="text"
                          value={projectTitle}
                          onChange={(e) => setProjectTitle(e.target.value)}
                          placeholder="What project was this for?"
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-3.5 text-sm text-white placeholder:text-white/10 outline-none focus:border-[#4F6EF7]/50 focus:bg-white/[0.05] transition-all"
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                            <Calendar size={12} /> Service Date
                          </label>
                          <input
                            type="date"
                            value={serviceDate}
                            onChange={(e) => setServiceDate(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-3 text-sm text-white outline-none focus:border-[#4F6EF7]/50 transition-all [color-scheme:dark]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                            <LinkIcon size={12} /> Project URL (Optional)
                          </label>
                          <input
                            type="url"
                            value={projectUrl}
                            onChange={(e) => setProjectUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-3 text-sm text-white placeholder:text-white/10 outline-none focus:border-[#4F6EF7]/50 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="text-sm font-medium text-white/40 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => canProceed() && setStep(1)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold transition-all",
                          canProceed()
                            ? "bg-white text-black hover:bg-[#F0F0F5] shadow-xl"
                            : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5",
                        )}
                      >
                        Next Step <ChevronRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    {/* Media Upload Area */}
                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        Showcase your project (Photos/Videos)
                      </label>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={cn(
                          "relative border-2 border-dashed rounded-[24px] p-10 text-center transition-all duration-300",
                          dragOver
                            ? "border-[#4F6EF7] bg-[#4F6EF7]/5"
                            : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
                        )}
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
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-white/20 transition-transform duration-300 group-hover:scale-110">
                          <Upload size={28} />
                        </div>
                        <h4 className="text-sm font-semibold text-white mb-1">
                          Click to upload or drag & drop
                        </h4>
                        <p className="text-[11px] text-white/30">
                          JPG, PNG, WebP or MP4 (max. 50MB per file)
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Upload states */}
                    {uploadStates.size > 0 && (
                      <div className="grid gap-3">
                        {Array.from(uploadStates.values()).map((state) => (
                          <div
                            key={state.id}
                            className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                {state.status === "uploading" ? (
                                  <Loader
                                    size={14}
                                    className="text-[#4F6EF7] animate-spin"
                                  />
                                ) : state.status === "done" ? (
                                  <CheckCircle2
                                    size={14}
                                    className="text-green-400"
                                  />
                                ) : (
                                  <AlertCircle
                                    size={14}
                                    className="text-red-400"
                                  />
                                )}
                                <span className="text-xs font-medium text-white/60 truncate max-w-[200px]">
                                  {state.file.name}
                                </span>
                              </div>
                              <button
                                onClick={() => removeUpload(state.id)}
                                className="text-white/20 hover:text-white transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <div className="h-1 w-full rounded-full bg-white/5">
                              <motion.div
                                className="h-full bg-[#4F6EF7]"
                                initial={{ width: 0 }}
                                animate={{ width: `${state.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Media Preview Grid */}
                    {media.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {media.map((m, i) => (
                          <div
                            key={i}
                            className="group relative aspect-square rounded-2xl overflow-hidden border border-white/[0.08] bg-black shadow-lg"
                          >
                            {m.type === "image" ? (
                              <img
                                src={m.url}
                                alt=""
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <div className="relative h-full w-full">
                                <video
                                  src={m.url}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <Play
                                    size={20}
                                    className="text-white opacity-80"
                                  />
                                </div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeMedia(i)}
                              className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-black/60 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md hover:bg-red-500"
                            >
                              <X size={14} />
                            </button>
                            <div className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 backdrop-blur-md">
                              {m.type === "image" ? (
                                <ImageIcon
                                  size={12}
                                  className="text-white/60"
                                />
                              ) : (
                                <Play size={12} className="text-white/60" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Improvement Suggestion */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        Any suggestions for improvement? (Optional)
                      </label>
                      <textarea
                        value={improvementSuggestion}
                        onChange={(e) =>
                          setImprovementSuggestion(e.target.value)
                        }
                        placeholder="Help us grow..."
                        rows={3}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-sm text-white placeholder:text-white/10 outline-none focus:border-[#4F6EF7]/50 focus:bg-white/[0.05] transition-all resize-none"
                      />
                    </div>

                    {/* Success/Error Toasts placeholder */}
                    {uploadError && (
                      <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                        <AlertCircle size={18} />
                        <p className="text-xs font-medium">{uploadError}</p>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setStep(0)}
                        className="flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white transition-colors"
                      >
                        <ChevronLeft size={16} /> Previous
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || uploadStates.size > 0}
                        className={cn(
                          "relative flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#4F6EF7] to-[#6B85FF] px-8 py-3.5 text-sm font-bold text-white shadow-2xl transition-all",
                          isSubmitting || uploadStates.size > 0
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:shadow-[0_0_32px_rgba(79,110,247,0.4)] hover:scale-[1.02]",
                        )}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader size={16} className="animate-spin" />{" "}
                            Submitting...
                          </>
                        ) : uploadStates.size > 0 ? (
                          <>
                            <Loader size={16} className="animate-spin" />{" "}
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Send size={16} /> Submit Feedback
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
