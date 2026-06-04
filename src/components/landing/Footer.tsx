"use client"

const year = new Date().getFullYear()

const links = [
  { name: "Services", href: "#services" },
  { name: "Process", href: "#process" },
  { name: "Work", href: "#work" },
  { name: "FAQ", href: "#faq" },
  { name: "Contact", href: "#contact" },
]

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          <div className="flex items-center gap-2.5">
            <img
              src="/favicon.png"
              alt="CAFÉ SERVICES"
              className="w-7 h-7 rounded-md"
            />
            <span className="text-base font-bold text-white">
              CAFÉ<span className="text-[#3b82f6]"> SERVICES</span>
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-600 hover:text-zinc-300 transition-colors duration-200"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="text-center md:text-right">
            <p className="text-xs text-zinc-700">
              &copy; {year} CAFÉ SERVICES. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
