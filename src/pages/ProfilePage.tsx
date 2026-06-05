import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  Lock,
  Loader2,
  Save,
  Shield,
  User,
} from "lucide-react";
import AuthBackground from "../components/auth/AuthBackground";
import Navbar from "../components/landing/Navbar";
import { AvatarUpload } from "../components/profile/AvatarUpload";
import {
  loadCurrentUser,
  saveCurrentUser,
  type FeedbackEntry,
  type UserProfile,
} from "../data/feedbackStore";
import {
  updateProfileMetadata,
  upsertPublicUser,
} from "../lib/supabaseProfile";
import { supabase } from "../lib/supabase/client";

interface ProfilePageProps {
  user: UserProfile | null;
  onSubmitFeedback: (feedback: FeedbackEntry) => void;
}

type ActiveTab = "profile" | "security";

interface ProfileForm {
  fullName: string;
  email: string;
  countryCode: string;
  phone: string;
}

const cardClass =
  "relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.03] shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl";

const tabs = [
  { id: "profile", label: "Profile Information", icon: User },
  { id: "security", label: "Security", icon: Shield },
] as const;

const links = [
  { label: "My Account", icon: LayoutDashboard, href: "/my-account" },
];

const countryCodes = [
  { country: "United States", code: "+1" },
  { country: "Canada", code: "+1" },
  { country: "United Kingdom", code: "+44" },
  { country: "Brazil", code: "+55" },
  { country: "Portugal", code: "+351" },
  { country: "Spain", code: "+34" },
  { country: "France", code: "+33" },
  { country: "Germany", code: "+49" },
  { country: "Italy", code: "+39" },
  { country: "Netherlands", code: "+31" },
  { country: "Ireland", code: "+353" },
  { country: "Mexico", code: "+52" },
  { country: "Argentina", code: "+54" },
  { country: "Chile", code: "+56" },
  { country: "Colombia", code: "+57" },
  { country: "Peru", code: "+51" },
  { country: "Uruguay", code: "+598" },
  { country: "Paraguay", code: "+595" },
  { country: "Japan", code: "+81" },
  { country: "South Korea", code: "+82" },
  { country: "China", code: "+86" },
  { country: "India", code: "+91" },
  { country: "Australia", code: "+61" },
  { country: "New Zealand", code: "+64" },
  { country: "South Africa", code: "+27" },
  { country: "Nigeria", code: "+234" },
  { country: "Kenya", code: "+254" },
  { country: "South Sudan", code: "+211" },
  { country: "United Arab Emirates", code: "+971" },
  { country: "Saudi Arabia", code: "+966" },
  { country: "Turkey", code: "+90" },
  { country: "Israel", code: "+972" },
];

const phoneFormats: Record<
  string,
  { maxDigits: number; format: (d: string) => string }
> = {
  "+55": {
    maxDigits: 11,
    format: (d) => {
      if (d.length <= 2) return d;
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10)
        return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
    },
  },
  "+1": {
    maxDigits: 11,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
    },
  },
  "+44": {
    maxDigits: 11,
    format: (d) => {
      if (d.length <= 5) return d;
      return `${d.slice(0, 5)} ${d.slice(5)}`;
    },
  },
  "+351": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    },
  },
  "+34": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    },
  },
  "+33": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 2) return d;
      if (d.length <= 4) return `${d.slice(0, 2)} ${d.slice(2)}`;
      if (d.length <= 6)
        return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
      if (d.length <= 8)
        return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6)}`;
      return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)} ${d.slice(8, 9)}`;
    },
  },
  "+49": {
    maxDigits: 11,
    format: (d) => {
      if (d.length <= 4) return d;
      return `${d.slice(0, 4)} ${d.slice(4)}`;
    },
  },
  "+39": {
    maxDigits: 10,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)}`;
    },
  },
  "+52": {
    maxDigits: 10,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6, 10)}`;
    },
  },
  "+54": {
    maxDigits: 10,
    format: (d) => {
      if (d.length <= 2) return d;
      if (d.length <= 5) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 8)
        return `(${d.slice(0, 2)}) ${d.slice(2, 5)}-${d.slice(5)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 5)}-${d.slice(5, 10)}`;
    },
  },
  "+56": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 2) return d;
      if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
      return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 9)}`;
    },
  },
  "+57": {
    maxDigits: 10,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)}`;
    },
  },
  "+51": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    },
  },
  "+598": {
    maxDigits: 8,
    format: (d) => {
      if (d.length <= 4) return d;
      return `${d.slice(0, 4)} ${d.slice(4, 8)}`;
    },
  },
  "+595": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    },
  },
  "+81": {
    maxDigits: 11,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
      return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 11)}`;
    },
  },
  "+82": {
    maxDigits: 11,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
      return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
    },
  },
  "+86": {
    maxDigits: 11,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)}`;
    },
  },
  "+91": {
    maxDigits: 10,
    format: (d) => {
      if (d.length <= 5) return d;
      return `${d.slice(0, 5)} ${d.slice(5, 10)}`;
    },
  },
  "+61": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 4) return d;
      return `${d.slice(0, 4)} ${d.slice(4, 9)}`;
    },
  },
  "+64": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    },
  },
  "+27": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 2) return d;
      if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
      return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 9)}`;
    },
  },
  "+234": {
    maxDigits: 11,
    format: (d) => {
      if (d.length <= 4) return d;
      if (d.length <= 8) return `${d.slice(0, 4)} ${d.slice(4)}`;
      return `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8, 11)}`;
    },
  },
  "+254": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    },
  },
  "+211": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    },
  },
  "+971": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    },
  },
  "+966": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    },
  },
  "+90": {
    maxDigits: 10,
    format: (d) => {
      if (d.length <= 4) return d;
      if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
      return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 10)}`;
    },
  },
  "+972": {
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
      return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 9)}`;
    },
  },
};

function getConfig(code: string) {
  return phoneFormats[code] || { maxDigits: 15, format: (d: string) => d };
}

const maskPhone = (value: string, countryCode: string) => {
  const digits = value.replace(/\D/g, "");
  const config = getConfig(countryCode);
  const limited = digits.slice(0, config.maxDigits);
  return config.format(limited);
};

function CountUp({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1000;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>{count}</span>;
}

function ReadOnlyRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-white/[0.06] px-1 py-4 transition-colors hover:bg-white/[0.02] sm:px-3">
      <span className="text-sm font-medium text-white/40">{label}</span>
      <span
        className={
          value
            ? "text-right text-sm font-medium text-white"
            : "text-right text-sm italic text-white/30"
        }
      >
        {value || "Not provided"}
      </span>
    </div>
  );
}

function ProfileCompletionCard({
  avatarUrl,
  fullName,
  email,
  phone,
}: {
  avatarUrl?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}) {
  const items = [
    { label: "Avatar", complete: Boolean(avatarUrl) },
    { label: "Name", complete: Boolean(fullName) },
    { label: "Email", complete: Boolean(email) },
    { label: "Phone", complete: Boolean(phone) },
    { label: "Bio", complete: false },
    { label: "Location", complete: false },
  ];
  const percent = Math.round(
    (items.filter((item) => item.complete).length / items.length) * 100,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">
            Complete your profile
          </h3>
          <p className="mt-1 text-sm text-white/40">
            Your profile is {percent}% complete
          </p>
        </div>
        <div className="rounded-full border border-[#4F6EF7]/25 bg-[#4F6EF7]/10 px-3 py-1 text-xs font-semibold text-[#9aa8ff]">
          {percent}%
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#8b5cf6]"
        />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2 text-sm"
          >
            <span className="text-white/55">{item.label}</span>
            <span
              className={
                item.complete
                  ? "text-[#22c55e]"
                  : "text-white/25"
              }
            >
              {item.complete ? "Complete" : "Missing"}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  children,
  delay,
  onBlur,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  children?: React.ReactNode;
  delay: number;
  onBlur?: () => void;
}) {
  return (
    <motion.label
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="block"
    >
      <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[#475569]">
        {label}
      </span>
      <span className="relative block">
        <input
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={onBlur}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-[#1a2d4a] bg-[#060d14] px-4 py-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-[#475569] focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] ${
            readOnly
              ? "cursor-not-allowed bg-[#060d14]/50 pr-11 text-[#475569]"
              : children
                ? "pr-14"
                : ""
          }`}
        />
        {readOnly && (
          <Lock
            size={16}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#475569]"
          />
        )}
        {children}
      </span>
    </motion.label>
  );
}

function getPasswordStrength(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (!password) {
    return { score: 0, label: "No password", color: "#475569", width: "0%" };
  }

  if (score <= 2) {
    return { score, label: "Weak password", color: "#ef4444", width: "33%" };
  }

  if (score <= 4) {
    return { score, label: "Medium password", color: "#f59e0b", width: "66%" };
  }

  return { score, label: "Strong password", color: "#22c55e", width: "100%" };
}

export default function ProfilePage({
  user,
  onSubmitFeedback,
}: ProfilePageProps) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    location.pathname.includes("settings") ||
    new URLSearchParams(location.search).get("tab") === "settings"
      ? "security"
      : "profile",
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastCopy, setToastCopy] = useState({
    title: "Profile updated",
    subtitle: "Your changes were saved.",
  });
  const [avatarUrl, setAvatarUrl] = useState(user?.photoUrl || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [form, setForm] = useState<ProfileForm>(() => {
    const stored = loadCurrentUser();
    const initialCode = stored?.countryCode || user?.countryCode || "+1";
    const initialPhone = stored?.phone || user?.phone || "";
    return {
      fullName: user?.name || stored?.name || "",
      email: user?.email || stored?.email || "",
      countryCode: initialCode,
      phone: initialPhone ? maskPhone(initialPhone, initialCode) : "",
    };
  });
  const [savedForm, setSavedForm] = useState(form);

  const displayName = savedForm.fullName || user?.name || "Client";
  const passwordStrength = useMemo(
    () => getPasswordStrength(newPassword),
    [newPassword],
  );
  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;

  useEffect(() => {
    if (!showToast) return;
    const timeout = window.setTimeout(() => setShowToast(false), 3500);
    return () => window.clearTimeout(timeout);
  }, [showToast]);

  if (!user) return <Navigate to="/login" replace />;
  // keep onSubmitFeedback reachable (some routes still pass it)
  void onSubmitFeedback;

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const notify = (title: string, subtitle: string) => {
    setToastCopy({ title, subtitle });
    setShowToast(true);
  };

  const saveProfile = async () => {
    setSavedForm(form);
    setIsEditing(false);

    const rawPhone = form.phone.replace(/\D/g, "");
    const payload = {
      name: form.fullName,
      phone: rawPhone,
      countryCode: form.countryCode,
    };

    await updateProfileMetadata(payload);

    const updated: UserProfile = {
      ...user!,
      uid: user!.uid,
      name: form.fullName,
      phone: rawPhone,
      countryCode: form.countryCode,
    };
    saveCurrentUser(updated);
    upsertPublicUser(updated);

    notify("Profile updated", "Your changes were saved.");
  };

  const cancelEdit = () => {
    setForm(savedForm);
    setIsEditing(false);
  };

  const submitPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!passwordsMatch || passwordStrength.score < 3) {
      setPasswordError(
        "Use a stronger password and make sure both fields match.",
      );
      notify(
        "Password not updated",
        "Use a stronger password and make sure both fields match.",
      );
      return;
    }

    if (!supabase) {
      setPasswordError("Authentication not configured.");
      notify("Password not updated", "Authentication is not configured.");
      return;
    }

    try {
      setPasswordLoading(true);
      // Re-authenticate with current password to validate ownership
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: user.email || "",
        password: currentPassword,
      });
      if (signError) {
        setPasswordError("Current password is incorrect.");
        notify("Password not updated", "Current password is incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setPasswordError("Could not update password. Try again later.");
        notify(
          "Password not updated",
          "Could not update password. Try again later.",
        );
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      notify("Password updated", "Your new password was saved.");
    } catch (error) {
      console.error("Error updating password:", error);
      setPasswordError("Unexpected error updating password.");
      notify("Password not updated", "Unexpected error updating password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const statItems = [
    { value: 0, label: "Orders" },
    { value: 0, label: "Services" },
    { value: 0, label: "Feedbacks" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f] px-4 pb-8 pt-28 text-white sm:px-6">
      <AuthBackground />
      <Navbar />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl gap-6 py-8 md:grid-cols-[minmax(280px,0.34fr)_1fr]">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className={`${cardClass} p-6`}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:url('data:image/svg+xml,%3Csvg_viewBox=%220_0_200_200%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.85%22_numOctaves=%223%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22200%22_height=%22200%22_filter=%22url(%23n)%22_opacity=%220.45%22/%3E%3C/svg%3E')]" />
          <div className="pb-2 pt-4 text-center">
            <div className="relative mx-auto flex flex-col items-center">
              <motion.div
                className="absolute inset-0 -z-10 scale-125 rounded-full bg-[#2563eb]/20 blur-xl"
                animate={{ opacity: [0.4, 0.8, 0.4], scale: [1.2, 1.4, 1.2] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                onUploadComplete={async (url) => {
                  setAvatarUrl(url);
                  const updated: UserProfile = {
                    ...user!,
                    uid: user!.uid,
                    photoUrl: url,
                  };
                  saveCurrentUser(updated);
                  await updateProfileMetadata({
                    avatar_url: url,
                    photoUrl: url,
                  });
                  upsertPublicUser(updated);
                }}
              />
              <motion.span
                className="absolute bottom-1 right-[calc(50%-52px)] h-4 w-4 rounded-full border-2 border-[#0a0a0f] bg-[#22c55e] shadow-[0_0_18px_rgba(34,197,94,0.75)]"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
              />
            </div>

            <h1
              className="mt-5 w-full break-words text-center font-['Clash_Display',Inter,sans-serif] text-2xl font-semibold text-white"
              style={
                {
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                } as React.CSSProperties
              }
            >
              {displayName}
            </h1>
            <p className="mt-1 truncate text-center text-sm text-white/45">
              {user.email}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-sm font-semibold text-[#b7c2ff] shadow-[0_6px_22px_rgba(59,130,246,0.12)]">
              <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
              Client Account
            </div>
          </div>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          <div className="grid grid-cols-3 gap-3">
            {statItems.map((item) => (
              <div
                key={item.label}
                className="flex min-w-0 flex-col items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-2 py-4"
              >
                <span className="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-2xl font-bold text-transparent">
                  <CountUp value={item.value} />
                </span>
                <span className="text-[10px] uppercase tracking-wider text-white/30">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    active
                      ? "flex w-full items-center gap-3 rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/15 px-4 py-3 font-medium text-white shadow-[0_0_16px_rgba(37,99,235,0.15)]"
                      : "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-white/45 transition-all duration-200 hover:bg-white/[0.04] hover:text-white"
                  }
                >
                  <Icon
                    className={active ? "text-[#3b82f6]" : "text-[#475569]"}
                    size={18}
                  />
                  {tab.label}
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="ml-auto h-1.5 w-1.5 rounded-full bg-[#3b82f6]"
                    />
                  )}
                </motion.button>
              );
            })}

            {links.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.href}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.15 }}
                >
                  <Link
                    to={item.href}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-white/45 transition-all duration-200 hover:bg-white/[0.04] hover:text-white"
                  >
                    <Icon className="text-[#475569]" size={18} />
                    {item.label}
                    <ChevronRight
                      className="ml-auto text-[#475569]"
                      size={16}
                    />
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className={`${cardClass} p-6 md:p-8`}
        >
          <AnimatePresence mode="wait">
            {activeTab === "profile" ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
              >
                <div className="mb-6 flex flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-['Clash_Display',Inter,sans-serif] text-2xl font-semibold text-white">
                      Profile Information
                    </h2>
                    <p className="mt-1 text-sm text-white/40">
                      Manage your personal details
                    </p>
                    <div className="mt-4 h-1 w-32 rounded-full bg-gradient-to-r from-[#2563eb] to-[#8b5cf6]" />
                  </div>

                  {!isEditing ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setIsEditing(true)}
                      className="rounded-xl bg-gradient-to-r from-[#2563eb] to-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(79,110,247,0.28)] transition-all hover:shadow-[0_0_36px_rgba(139,92,246,0.38)]"
                    >
                      Edit Profile
                    </motion.button>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={cancelEdit}
                        className="rounded-xl border border-[#1a2d4a] px-4 py-2.5 text-sm text-[#94a3b8] transition-all duration-200 hover:border-[#2a4a7a] hover:text-white"
                      >
                        Cancel
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={saveProfile}
                        className="flex items-center gap-2 rounded-xl border border-[#3b82f6]/30 bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-300 hover:bg-[#1d4ed8] hover:shadow-[0_0_32px_rgba(37,99,235,0.55)]"
                      >
                        <Save size={16} />
                        Save
                      </motion.button>
                    </div>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!isEditing ? (
                    <motion.div
                      key="view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <ReadOnlyRow
                        label="Full name"
                        value={savedForm.fullName}
                      />
                      <ReadOnlyRow label="Email" value={savedForm.email} />
                      <ReadOnlyRow
                        label="Phone"
                        value={
                          savedForm.phone
                            ? `${savedForm.countryCode} ${savedForm.phone}`
                            : ""
                        }
                      />
                      <ReadOnlyRow label="Location" value={user.country} />
                      <ReadOnlyRow label="Bio / About" value="" />
                      <ProfileCompletionCard
                        avatarUrl={avatarUrl}
                        fullName={savedForm.fullName}
                        email={savedForm.email}
                        phone={savedForm.phone}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <Field
                            label="Full name"
                            value={form.fullName}
                            onChange={(value) => updateField("fullName", value)}
                            delay={0}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Field
                            label="Email"
                            value={form.email}
                            readOnly
                            delay={0.06}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <motion.label
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.12 }}
                            className="block"
                          >
                            <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[#475569]">
                              Phone
                            </span>
                            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                              <select
                                value={form.countryCode}
                                onChange={(event) => {
                                  const newCode = event.target.value;
                                  updateField("countryCode", newCode);
                                  updateField(
                                    "phone",
                                    maskPhone(form.phone, newCode),
                                  );
                                }}
                                className="w-full rounded-xl border border-[#1a2d4a] bg-[#060d14] px-4 py-3 text-sm text-white outline-none transition-all duration-200 focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                              >
                                {countryCodes.map((item) => (
                                  <option
                                    key={`${item.country}-${item.code}`}
                                    value={item.code}
                                  >
                                    {item.code} - {item.country}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={form.phone}
                                onChange={(event) =>
                                  updateField(
                                    "phone",
                                    maskPhone(
                                      event.target.value,
                                      form.countryCode,
                                    ),
                                  )
                                }
                                placeholder="Phone number"
                                inputMode="numeric"
                                className="w-full rounded-xl border border-[#1a2d4a] bg-[#060d14] px-4 py-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-[#475569] focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                              />
                            </div>
                          </motion.label>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center gap-3 border-t border-[#1a2d4a] pt-6">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={saveProfile}
                          className="relative flex items-center gap-2 overflow-hidden rounded-xl border border-[#3b82f6]/30 bg-[#2563eb] px-6 py-2.5 font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-300 hover:bg-[#1d4ed8] hover:shadow-[0_0_32px_rgba(37,99,235,0.55)]"
                        >
                          <Save size={16} />
                          Save Changes
                        </motion.button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-xl border border-[#1a2d4a] px-6 py-2.5 text-[#94a3b8] transition-all duration-200 hover:border-[#2a4a7a] hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
              >
                <div className="mb-6 border-b border-[#1a2d4a] pb-6">
                  <h2 className="text-xl font-bold text-white">Security</h2>
                  <p className="mt-1 text-sm text-[#94a3b8]">
                    Manage passwords, sessions and connected accounts.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Change Password */}
                  <div className="rounded-2xl border border-[#1a2d4a] bg-[#060d14] p-4">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2563eb]/20 bg-[#2563eb]/10 text-[#60a5fa]">
                        <KeyRound size={18} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          Change password
                        </h3>
                        <p className="mt-1 text-sm text-[#94a3b8]">
                          Update your password. Use a strong, unique password.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={submitPassword} className="grid gap-3">
                      <label className="block">
                        <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[#475569]">
                          Current password
                        </span>
                        <div className="relative">
                          <input
                            type={showPasswords ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="w-full rounded-xl border border-[#1a2d4a] bg-[#0a1628] px-4 py-3 pr-12 text-sm text-white outline-none placeholder:text-[#475569] focus:border-[#2563eb]"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[#475569]">
                          New password
                        </span>
                        <div className="relative">
                          <input
                            type={showPasswords ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Create a strong password"
                            className="w-full rounded-xl border border-[#1a2d4a] bg-[#0a1628] px-4 py-3 pr-12 text-sm text-white outline-none placeholder:text-[#475569] focus:border-[#2563eb]"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[#475569]">
                          Confirm password
                        </span>
                        <div className="relative">
                          <input
                            type={showPasswords ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                            className="w-full rounded-xl border border-[#1a2d4a] bg-[#0a1628] px-4 py-3 pr-12 text-sm text-white outline-none placeholder:text-[#475569] focus:border-[#2563eb]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords((s) => !s)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#94a3b8] hover:text-white"
                            aria-label={
                              showPasswords
                                ? "Hide passwords"
                                : "Show passwords"
                            }
                          >
                            {showPasswords ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      </label>

                      <div className="rounded-xl border border-[#1a2d4a] bg-[#0a1628] p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-mono text-xs uppercase tracking-wider text-[#475569]">
                            Password strength
                          </span>
                          <span
                            className="text-sm font-semibold"
                            style={{ color: passwordStrength.color }}
                          >
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#060d14] mb-2">
                          <motion.div
                            className="h-full rounded-full"
                            animate={{
                              width: passwordStrength.width,
                              backgroundColor: passwordStrength.color,
                            }}
                            transition={{ duration: 0.35 }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-[#94a3b8] sm:grid-cols-4">
                          {[
                            {
                              label: "8+ chars",
                              active: newPassword.length >= 8,
                            },
                            {
                              label: "Uppercase",
                              active: /[A-Z]/.test(newPassword),
                            },
                            { label: "Number", active: /\d/.test(newPassword) },
                            {
                              label: "Symbol",
                              active: /[^A-Za-z0-9]/.test(newPassword),
                            },
                          ].map((rule) => (
                            <div
                              key={rule.label}
                              className={
                                rule.active
                                  ? "flex items-center gap-2 text-[#22c55e]"
                                  : "flex items-center gap-2 text-[#475569]"
                              }
                            >
                              <div
                                className={
                                  rule.active
                                    ? "h-3 w-3 rounded-full bg-[#22c55e]"
                                    : "h-3 w-3 rounded-full bg-[#24354a]"
                                }
                              />
                              <span>{rule.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {passwordError && (
                        <p className="text-sm text-red-400">{passwordError}</p>
                      )}
                      {passwordSuccess && (
                        <p className="text-sm text-green-400">
                          Password updated successfully.
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#3b82f6]/30 bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(37,99,235,0.25)] hover:bg-[#1d4ed8]"
                        >
                          {passwordLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          Update password
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                          }}
                          className="rounded-xl border border-[#1a2d4a] px-4 py-2 text-sm text-[#94a3b8]"
                        >
                          Clear
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="rounded-2xl border border-[#1a2d4a] bg-[#060d14] p-4">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2563eb]/20 bg-[#2563eb]/10 text-[#60a5fa]">
                        <Shield size={18} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          Two-Factor Authentication
                        </h3>
                        <p className="mt-1 text-sm text-[#94a3b8]">
                          Add an extra layer of security to your account.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-[#94a3b8]">
                        Authenticator app (TOTP)
                      </div>
                      <button className="rounded-xl border border-[#1a2d4a] px-3 py-1 text-sm text-[#94a3b8]">
                        Configure
                      </button>
                    </div>
                  </div>

                  {/* Active Sessions */}
                  <div className="rounded-2xl border border-[#1a2d4a] bg-[#060d14] p-4">
                    <h3 className="font-semibold text-white">
                      Active sessions
                    </h3>
                    <p className="mt-2 text-sm text-[#94a3b8]">
                      Manage devices currently signed in to your account.
                    </p>
                    <div className="mt-3 text-sm text-[#94a3b8]">
                      No active sessions found.
                    </div>
                  </div>

                  {/* Connected Accounts */}
                  <div className="rounded-2xl border border-[#1a2d4a] bg-[#060d14] p-4">
                    <h3 className="font-semibold text-white">
                      Connected accounts
                    </h3>
                    <p className="mt-2 text-sm text-[#94a3b8]">
                      Connect or disconnect third-party logins (Google, GitHub).
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button className="rounded-xl border border-[#1a2d4a] px-3 py-1 text-sm text-[#94a3b8]">
                        Connect Google
                      </button>
                      <button className="rounded-xl border border-[#1a2d4a] px-3 py-1 text-sm text-[#94a3b8]">
                        Connect GitHub
                      </button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="rounded-2xl border border-[#4b1f1f] bg-[#160808] p-4">
                    <h3 className="font-semibold text-white">Danger zone</h3>
                    <p className="mt-2 text-sm text-[#fca5a5]">
                      Deleting your account is permanent. All data will be
                      removed.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button className="rounded-xl bg-[#7f1d1d] px-3 py-1 text-sm font-semibold text-white">
                        Delete account
                      </button>
                      <button className="rounded-xl border border-[#4b1f1f] px-3 py-1 text-sm text-[#fca5a5]">
                        Deactivate
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 48, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 flex min-w-[280px] items-center gap-3 rounded-2xl border border-[#22c55e]/30 bg-[#0a1628] px-5 py-4 shadow-[0_0_24px_rgba(34,197,94,0.15)]"
          >
            <CheckCircle2 size={22} className="text-[#22c55e]" />
            <div>
              <p className="font-semibold text-white">{toastCopy.title}</p>
              <p className="text-sm text-[#94a3b8]">{toastCopy.subtitle}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
