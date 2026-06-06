export default function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-28 rounded-lg bg-white/[0.06]" />
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-24 rounded bg-white/[0.06]" />
            <div className="h-10 w-full max-w-md rounded-lg bg-white/[0.04]" />
            <div className="h-3 w-36 rounded bg-white/[0.03]" />
          </div>
        ))}
      </div>
    </div>
  )
}
