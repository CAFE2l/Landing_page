export interface Testimonial {
  quote: string
  name: string
  role: string
  company: string
  flag: string
  initials: string
  rating: number
}

export const testimonials: Testimonial[] = [
  {
    quote: "Professional work, delivered on time. The communication was smooth and the final product exceeded our expectations.",
    name: "Carlos Mendez",
    role: "Founder",
    company: "TechFlow",
    flag: "\ud83c\uddfa\ud83c\uddf8",
    initials: "CM",
    rating: 5,
  },
  {
    quote: "Rare to find someone who combines technical skill with design sense. The dashboard we built together is used daily by our entire team.",
    name: "Sarah Chen",
    role: "CTO",
    company: "GreenMarket",
    flag: "\ud83c\udde8\ud83c\udde6",
    initials: "SC",
    rating: 5,
  },
  {
    quote: "Handled our full rebrand and platform migration without a hitch. Clear timelines, honest communication, great results.",
    name: "Michael Torres",
    role: "CEO",
    company: "FinFlow",
    flag: "\ud83c\uddfa\ud83c\uddf8",
    initials: "MT",
    rating: 5,
  },
]
