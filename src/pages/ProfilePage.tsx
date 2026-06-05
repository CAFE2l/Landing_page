import { useEffect, useMemo, useRef, useState } from "react";
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
  Search,
  Shield,
  User,
  UserPlus,
  CalendarDays,
  X,
} from "lucide-react";
import AuthBackground from "../components/auth/AuthBackground";
import Navbar from "../components/landing/Navbar";
import { AvatarUpload } from "../components/profile/AvatarUpload";
import PhoneInput, { formatPhoneDisplay } from "../components/ui/PhoneInput";
import FollowButton from "../components/ui/FollowButton";
import {
  updatePublicProfile,
  updateProfileMetadata,
} from "../lib/supabaseProfile";
import { supabase } from "../lib/supabase/client";
import {
  fetchFollowersList,
  fetchFollowingList,
  fetchFollowingIds,
  toggleFollow,
} from "../lib/socialService";
import { useUserProfile } from "../hooks/useUserProfile";
import { useAuth } from "../contexts/AuthContext";

type ActiveTab = "profile" | "security";

interface ProfileForm {
  fullName: string;
  email: string;
  phoneE164: string;
  location: string;
  locationCountryCode: string;
  bio: string;
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

const countries = [
  { name: "Brazil", code: "BR", flag: "🇧🇷" },
  { name: "United States", code: "US", flag: "🇺🇸" },
  { name: "Portugal", code: "PT", flag: "🇵🇹" },
  { name: "Argentina", code: "AR", flag: "🇦🇷" },
  { name: "Canada", code: "CA", flag: "🇨🇦" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
  { name: "Spain", code: "ES", flag: "🇪🇸" },
  { name: "France", code: "FR", flag: "🇫🇷" },
  { name: "Germany", code: "DE", flag: "🇩🇪" },
  { name: "Italy", code: "IT", flag: "🇮🇹" },
  { name: "Netherlands", code: "NL", flag: "🇳🇱" },
  { name: "Ireland", code: "IE", flag: "🇮🇪" },
  { name: "Mexico", code: "MX", flag: "🇲🇽" },
  { name: "Chile", code: "CL", flag: "🇨🇱" },
  { name: "Colombia", code: "CO", flag: "🇨🇴" },
  { name: "Peru", code: "PE", flag: "🇵🇪" },
  { name: "Uruguay", code: "UY", flag: "🇺🇾" },
  { name: "Paraguay", code: "PY", flag: "🇵🇾" },
  { name: "Japan", code: "JP", flag: "🇯🇵" },
  { name: "South Korea", code: "KR", flag: "🇰🇷" },
  { name: "China", code: "CN", flag: "🇨🇳" },
  { name: "India", code: "IN", flag: "🇮🇳" },
  { name: "Australia", code: "AU", flag: "🇦🇺" },
  { name: "New Zealand", code: "NZ", flag: "🇳🇿" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦" },
  { name: "Nigeria", code: "NG", flag: "🇳🇬" },
  { name: "Kenya", code: "KE", flag: "🇰🇪" },
  { name: "United Arab Emirates", code: "AE", flag: "🇦🇪" },
  { name: "Saudi Arabia", code: "SA", flag: "🇸🇦" },
  { name: "Turkey", code: "TR", flag: "🇹🇷" },
  { name: "Israel", code: "IL", flag: "🇮🇱" },
  { name: "Morocco", code: "MA", flag: "🇲🇦" },
  { name: "Egypt", code: "EG", flag: "🇪🇬" },
  { name: "Poland", code: "PL", flag: "🇵🇱" },
  { name: "Sweden", code: "SE", flag: "🇸🇪" },
  { name: "Norway", code: "NO", flag: "🇳🇴" },
  { name: "Denmark", code: "DK", flag: "🇩🇰" },
  { name: "Finland", code: "FI", flag: "🇫🇮" },
  { name: "Switzerland", code: "CH", flag: "🇨🇭" },
  { name: "Belgium", code: "BE", flag: "🇧🇪" },
];

const getCountryFlag = (countryName?: string, code?: string) =>
  countries.find(
    (country) => country.code === code || country.name === countryName,
  )?.flag || "";

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

function CountrySelector({
  value,
  code,
  onSelect,
}: {
  value: string;
  code: string;
  onSelect: (country: { name: string; code: string; flag: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const filtered = countries.filter((country) =>
    `${country.name} ${country.code}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
        />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          placeholder="Search your country..."
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 pl-10 text-sm text-white outline-none placeholder:text-white/30 focus:border-blue-500/50"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-white/[0.08] bg-[#0d0d14]/95 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-white/35">
              No countries found
            </div>
          ) : (
            filtered.map((country) => {
              const selected = country.code === code || country.name === value;
              return (
                <button
                  type="button"
                  key={country.code}
                  onClick={() => {
                    onSelect(country);
                    setQuery(country.name);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.05] ${
                    selected ? "bg-blue-500/10 text-blue-400" : "text-white/70"
                  }`}
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function ProfileCompletionCard({
  avatarUrl,
  fullName,
  email,
  phone,
  location,
  bio,
}: {
  avatarUrl?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
}) {
  const items = [
    { label: "Avatar", complete: Boolean(avatarUrl) },
    { label: "Name", complete: Boolean(fullName) },
    { label: "Email", complete: Boolean(email) },
    { label: "Phone", complete: Boolean(phone) },
    { label: "Bio", complete: Boolean(bio) },
    { label: "Location", complete: Boolean(location) },
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
              className={item.complete ? "text-[#22c55e]" : "text-white/25"}
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

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const {
    profile,
    loading: profileLoading,
    refresh: refreshProfile,
  } = useUserProfile();
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [form, setForm] = useState<ProfileForm>({
    fullName: "",
    email: "",
    phoneE164: "",
    location: "",
    locationCountryCode: "",
    bio: "",
  });
  const [savedForm, setSavedForm] = useState(form);

  useEffect(() => {
    if (profile) {
      const newForm = {
        fullName: profile.full_name || "",
        email: profile.email || "",
        phoneE164: "",
        location: "",
        locationCountryCode: "",
        bio: profile.bio || "",
      };
      setForm(newForm);
      setSavedForm(newForm);
    }
  }, [profile]);

  // ========== Social (Following / Followers) ==========
  const [socialDrawer, setSocialDrawer] = useState<
    "followers" | "following" | null
  >(null);
  const [socialList, setSocialList] = useState<
    Array<{
      id: string;
      name: string;
      username: string | null;
      avatarUrl: string | null;
      bio: string | null;
    }>
  >([]);
  const [socialSearch, setSocialSearch] = useState("");
  const [socialLoading, setSocialLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState<Set<string>>(new Set());

  const openSocialDrawer = async (type: "followers" | "following") => {
    if (!profile?.id) return;
    setSocialDrawer(type);
    setSocialSearch("");
    setSocialLoading(true);
    const list =
      type === "followers"
        ? await fetchFollowersList(profile.id)
        : await fetchFollowingList(profile.id);
    setSocialList(list);
    setSocialLoading(false);

    if (profile?.id) {
      const ids = await fetchFollowingIds(profile.id);
      setFollowingMap(ids);
    }
  };

  const handleToggleFollow = async (targetId: string) => {
    if (!profile?.id) return;
    const wasFollowing = followingMap.has(targetId);
    const ok = await toggleFollow(profile.id, targetId);
    if (ok !== undefined) {
      setFollowingMap((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.delete(targetId);
        else next.add(targetId);
        return next;
      });
      refreshProfile();
    }
  };

  const displayName = profile?.full_name || "User";
  const avatarUrl = profile?.avatar_url || "";
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

  if (!authUser && !profileLoading) return <Navigate to="/login" replace />;

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const notify = (title: string, subtitle: string) => {
    setToastCopy({ title, subtitle });
    setShowToast(true);
  };

  const saveProfile = async () => {
    if (!profile?.id) return;
    setSavedForm(form);
    setIsEditing(false);

    const payload = {
      name: form.fullName,
      bio: form.bio,
    };

    await updateProfileMetadata(payload);

    await updatePublicProfile({
      uid: profile.id,
      name: form.fullName,
      photoUrl: avatarUrl,
      email: profile.email,
      role: profile.role,
      bio: form.bio,
    } as any);

    refreshProfile();
    window.dispatchEvent(new Event("cafe-profile-updated"));

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
        email: profile?.email || "",
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

  const showBadge = profile?.role || "client";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f] px-4 pb-8 pt-28 text-white sm:px-6">
      <AuthBackground />
      <Navbar />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl gap-6 py-8 md:grid-cols-[minmax(360px,0.38fr)_1fr]">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className={`${cardClass} p-6`}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:url('data:image/svg+xml,%3Csvg_viewBox=%220_0_200_200%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.85%22_numOctaves=%223%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22200%22_height=%22200%22_filter=%22url(%23n)%22_opacity=%220.45%22/%3E%3C/svg%3E')]" />

          {/* Avatar */}
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
                  if (!profile?.id) return;
                  await updateProfileMetadata({ photoUrl: url });
                  await updatePublicProfile({
                    uid: profile.id,
                    name: profile.full_name,
                    photoUrl: url,
                    email: profile.email,
                    role: profile.role,
                    bio: profile.bio,
                  } as any);
                  refreshProfile();
                  window.dispatchEvent(new Event("cafe-profile-updated"));
                }}
              />
            </div>

            <h1 className="mt-5 font-['Clash_Display',Inter,sans-serif] text-2xl font-semibold text-white">
              {displayName}
            </h1>
            {profile?.username && (
              <p className="mt-0.5 text-sm text-[#60a5fa]/70">
                @{profile.username}
              </p>
            )}
            <p className="mt-1 text-sm text-white/45">{profile?.email}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#b7c2ff] shadow-[0_6px_22px_rgba(59,130,246,0.12)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {showBadge === "admin" ? "Admin" : "Client Account"}
            </div>
          </div>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Stats grid: 3 + 2 layout fixed */}
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-3 gap-2.5">
              {statItems.map((item) => (
                <motion.div
                  key={item.label}
                  whileHover={{ y: -2 }}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-2 py-3.5 transition-all hover:border-blue-500/20 hover:shadow-[0_0_20px_rgba(37,99,235,0.08)]"
                >
                  <span className="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-xl font-bold text-transparent">
                    <CountUp value={item.value} />
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-white/30">
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <motion.button
                whileHover={{ y: -2 }}
                onClick={() => openSocialDrawer("following")}
                className="flex flex-col items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-2 py-3.5 transition-all hover:border-blue-500/20 hover:shadow-[0_0_20px_rgba(37,99,235,0.08)] cursor-pointer"
              >
                <span className="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-xl font-bold text-transparent">
                  <CountUp value={profile?.following_count || 0} />
                </span>
                <span className="text-[10px] uppercase tracking-wider text-white/30">
                  Following
                </span>
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                onClick={() => openSocialDrawer("followers")}
                className="flex flex-col items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-2 py-3.5 transition-all hover:border-blue-500/20 hover:shadow-[0_0_20px_rgba(37,99,235,0.08)] cursor-pointer"
              >
                <span className="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-xl font-bold text-transparent">
                  <CountUp value={profile?.followers_count || 0} />
                </span>
                <span className="text-[10px] uppercase tracking-wider text-white/30">
                  Followers
                </span>
              </motion.button>
            </div>
          </div>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          <nav className="space-y-1.5 flex-1">
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

          {/* Info row */}
          <div className="mt-auto flex items-center justify-center gap-4 text-xs text-white/30 pt-6">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={12} className="text-white/20" />
              Member since{" "}
              {profile
                ? new Date().toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : "..."}
            </span>
          </div>
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
                          savedForm.phoneE164
                            ? formatPhoneDisplay(savedForm.phoneE164)
                            : ""
                        }
                      />
                      <ReadOnlyRow
                        label="Location"
                        value={
                          savedForm.location
                            ? `${getCountryFlag(savedForm.location, savedForm.locationCountryCode)} ${savedForm.location}`.trim()
                            : ""
                        }
                      />
                      <ReadOnlyRow label="Bio / About" value={savedForm.bio} />
                      <ProfileCompletionCard
                        avatarUrl={avatarUrl}
                        fullName={savedForm.fullName}
                        email={savedForm.email}
                        phone={savedForm.phoneE164}
                        location={savedForm.location}
                        bio={savedForm.bio}
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
                          <motion.div
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.12 }}
                          >
                            <PhoneInput
                              value={form.phoneE164}
                              onChange={(e164) =>
                                updateField("phoneE164", e164)
                              }
                              label="Phone"
                              placeholder="Phone number"
                            />
                          </motion.div>
                        </div>
                        <div className="md:col-span-2">
                          <motion.label
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.16 }}
                            className="block"
                          >
                            <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[#475569]">
                              Location
                            </span>
                            <CountrySelector
                              value={form.location}
                              code={form.locationCountryCode}
                              onSelect={(country) => {
                                updateField("location", country.name);
                                updateField(
                                  "locationCountryCode",
                                  country.code,
                                );
                              }}
                            />
                          </motion.label>
                        </div>
                        <div className="md:col-span-2">
                          <motion.label
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="block"
                          >
                            <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[#475569]">
                              Bio / About
                            </span>
                            <textarea
                              value={form.bio}
                              onChange={(event) =>
                                updateField(
                                  "bio",
                                  event.target.value.slice(0, 300),
                                )
                              }
                              placeholder="Tell clients a bit about yourself..."
                              rows={3}
                              maxLength={300}
                              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-white/30 focus:border-blue-500/50"
                            />
                            <span className="mt-1 block text-right text-xs text-white/30">
                              {form.bio.length}/300
                            </span>
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
                    Manage passwords, sessions and security settings.
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

      {/* Social Drawer (Following / Followers) */}
      <AnimatePresence>
        {socialDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSocialDrawer(null)}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-12 pb-8 backdrop-blur-sm sm:items-center sm:pt-0 sm:pb-0"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0f]/95 shadow-2xl backdrop-blur-xl sm:h-auto sm:max-h-[600px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <h2 className="text-base font-semibold text-white">
                  {socialDrawer === "following" ? "Following" : "Followers"}
                </h2>
                <button
                  onClick={() => setSocialDrawer(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search */}
              <div className="px-5 pt-3 pb-2">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                  />
                  <input
                    value={socialSearch}
                    onChange={(e) => setSocialSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-blue-500/40 transition-colors"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-5 pb-4 scrollbar-thin scrollbar-thumb-white/[0.06]">
                {socialLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 size={20} className="animate-spin text-white/40" />
                  </div>
                ) : socialList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <UserPlus size={28} className="mb-3 text-white/15" />
                    <p className="text-sm text-white/30">
                      {socialDrawer === "following"
                        ? "Not following anyone yet"
                        : "No followers yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {socialList
                      .filter(
                        (u) =>
                          u.name
                            .toLowerCase()
                            .includes(socialSearch.toLowerCase()) ||
                          (u.username || "")
                            .toLowerCase()
                            .includes(socialSearch.toLowerCase()),
                      )
                      .map((user) => (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 text-sm font-bold text-blue-400">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              user.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {user.name}
                            </p>
                            {user.username && (
                              <p className="truncate text-xs text-white/40">
                                @{user.username}
                              </p>
                            )}
                            {user.bio && (
                              <p className="truncate text-xs text-white/30 mt-0.5">
                                {user.bio}
                              </p>
                            )}
                          </div>
                          {profile?.id && profile.id !== user.id && (
                            <FollowButton
                              currentUserId={profile.id}
                              targetUserId={user.id}
                              initialFollowing={followingMap.has(user.id)}
                              onStateChange={() => handleToggleFollow(user.id)}
                              variant="compact"
                            />
                          )}
                        </motion.div>
                      ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
