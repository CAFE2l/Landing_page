"use client"

import { Link } from "react-router-dom"
import { MessageSquare, ArrowLeft } from "lucide-react"

export function ForumMobileNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0A0A0F]/90 backdrop-blur-xl border-t border-[#1E1E2A]">
      <div className="flex items-center justify-around px-2 py-2">
        <Link
          to="/forum"
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] text-[#6B6B80]"
          aria-label="Back to forum"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </Link>
        <Link
          to="/forum"
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] text-[#4F6EF7]"
          aria-label="Forum home"
        >
          <MessageSquare size={18} />
          <span>Forum</span>
        </Link>
      </div>
    </div>
  )
}
