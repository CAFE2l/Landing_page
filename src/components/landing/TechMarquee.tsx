"use client"

interface Tech {
  name: string
  slug: string
  color: string
}

const row1: Tech[] = [
  { name: "React", slug: "react", color: "61DAFB" },
  { name: "TypeScript", slug: "typescript", color: "3178C6" },
  { name: "Tailwind CSS", slug: "tailwindcss", color: "06B6D4" },
  { name: "Node.js", slug: "nodedotjs", color: "5FA04E" },
  { name: "PostgreSQL", slug: "postgresql", color: "4169E1" },
  { name: "Prisma", slug: "prisma", color: "ffffff" },
  { name: "Framer Motion", slug: "framer", color: "0055FF" },
  { name: "Figma", slug: "figma", color: "F24E1E" },
  { name: "Vercel", slug: "vercel", color: "ffffff" },
  { name: "Next.js", slug: "nextdotjs", color: "ffffff" },
  { name: "Git", slug: "git", color: "F05032" },
  { name: "Docker", slug: "docker", color: "2496ED" },
]

const row2: Tech[] = [
  { name: "Docker", slug: "docker", color: "2496ED" },
  { name: "Git", slug: "git", color: "F05032" },
  { name: "Next.js", slug: "nextdotjs", color: "ffffff" },
  { name: "Vercel", slug: "vercel", color: "ffffff" },
  { name: "Figma", slug: "figma", color: "F24E1E" },
  { name: "Framer Motion", slug: "framer", color: "0055FF" },
  { name: "Prisma", slug: "prisma", color: "ffffff" },
  { name: "PostgreSQL", slug: "postgresql", color: "4169E1" },
  { name: "Node.js", slug: "nodedotjs", color: "5FA04E" },
  { name: "Tailwind CSS", slug: "tailwindcss", color: "06B6D4" },
  { name: "TypeScript", slug: "typescript", color: "3178C6" },
  { name: "React", slug: "react", color: "61DAFB" },
]

function Badge({ tech }: { tech: Tech }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.08] hover:border-white/20 hover:text-white transition-all duration-200 shrink-0">
      <img
        src={`https://cdn.simpleicons.org/${tech.slug}/${tech.color}`}
        alt={tech.name}
        className="w-5 h-5 shrink-0"
        loading="lazy"
      />
      {tech.name}
    </span>
  )
}

export default function TechMarquee() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      />

      <div className="flex flex-col gap-5">
        <div className="flex animate-marquee gap-4 whitespace-nowrap" style={{ animationDuration: "30s" }}>
          {[...row1, ...row1].map((tech, i) => (
            <Badge key={`r1-${i}`} tech={tech} />
          ))}
        </div>

        <div
          className="flex gap-4 whitespace-nowrap"
          style={{
            animation: `marquee 25s linear infinite reverse`,
          }}
        >
          {[...row2, ...row2].map((tech, i) => (
            <Badge key={`r2-${i}`} tech={tech} />
          ))}
        </div>
      </div>
    </section>
  )
}
