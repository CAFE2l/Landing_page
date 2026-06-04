import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import toast from "react-hot-toast"
import FilterBar from "../../components/admin/FilterBar"
import FeedbackTable from "../../components/admin/FeedbackTable"
import FeedbackDrawer from "../../components/admin/FeedbackDrawer"
import { useAdminStore } from "../../lib/store/adminStore"
import { getAllFeedback, approveFeedback, rejectFeedback, deleteFeedback, updateAdminNote } from "../../lib/supabase/admin"
import type { FeedbackEntry } from "../../lib/types"

const mockFeedbacks: FeedbackEntry[] = Array.from({ length: 25 }, (_, i) => ({
  id: `fb-${i}`,
  userId: `user-${i}`,
  userName: ["Maria Silva", "João Pereira", "Ana Luiza", "Carlos Mendes", "Julia Rocha", "Pedro Alves", "Lucas Costa", "Fernanda Santos"][i % 8],
  userEmail: `user${i}@example.com`,
  title: [
    "Landing page conversion subiu 34% com o novo design",
    "Dashboard em tempo real superou expectativas da equipe",
    "Migração para Next.js reduziu tempo de carregamento em 60%",
    "Sistema de agendamento automatizado economizou 20h/semana",
    "Portal do cliente ficou incrível — feedback dos usuários foi unânime",
    "Integração com Stripe finalizada antes do prazo",
    "Refatoração do front-end legacy eliminou 90% dos bugs",
    "Relatório automático de vendas agora roda em segundos",
  ][i % 8],
  body: [
    "O redesigned completo da landing page resultou em um aumento de 34% na taxa de conversão em apenas duas semanas. O novo layout com seções de prova social e um formulário otimizado de 3 campos fez toda a diferença nos resultados.",
    "O dashboard que a Café Services construiu para nossa equipe transformou a forma como acompanhamos métricas. Dados em tempo real com gráficos interativos e alertas inteligentes que nos ajudam a tomar decisões mais rápidas.",
    "Migramos nosso site legado PHP para Next.js 14 com a ajuda da Café. O resultado foi uma redução de 60% no tempo de carregamento e uma melhoria significativa no Core Web Vitals. O SEO disparou nos primeiros 30 dias.",
    "O sistema de agendamento automatizado que desenvolvemos juntos mudou completamente nossa operação. Clientes agora fazem booking direto pelo site, sem intervenção manual. Economizamos mais de 20 horas por semana.",
    "O novo portal do cliente está lindo. A navegação é intuitiva, o design é moderno e a performance é impecável. Nossos clientes elogiaram muito a experiência — o NPS subiu 15 pontos desde o lançamento.",
    "A integração com Stripe que a equipe implementou funcionou perfeitamente desde o primeiro deploy. Checkout otimizado, webhooks configurados corretamente e suporte a subscription management completo.",
    "A refatoração do front-end legacy eliminou 90% dos bugs reportados. O código ficou mais limpo, a manutenção muito mais simples e a equipe de desenvolvimento ganhou produtividade.",
    "O sistema de relatórios automáticos de vendas que antes levava horas para ser gerado manualmente agora roda em segundos com visualização interativa e exportação em múltiplos formatos.",
  ][i % 8],
  channel: (["website", "whatsapp", "email", "discord", "telegram"] as const)[i % 5],
  status: (["pending", "approved", "rejected"] as const)[i % 3],
  rating: 4 + (i % 2),
  isTestimonial: i % 3 === 0,
  verifiedResult: i % 4 === 0 ? "Resultado verificado: melhoria de 34% na conversão com aumento de 60% na performance" : undefined,
  adminNote: i % 5 === 0 ? "Cliente pediu ajustes no formulário de contato" : undefined,
  metrics: i % 3 === 0 ? { views: 1234, clicks: 456, conversion: 34 } : undefined,
  mediaCount: i % 4,
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
}))

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>(mockFeedbacks)
  const [loading, setLoading] = useState(true)
  const filters = useAdminStore((s) => s.filters)
  const selectedFeedbackId = useAdminStore((s) => s.ui.selectedFeedbackId)

  useEffect(() => {
    getAllFeedback().then(({ data }) => {
      if (data && data.length > 0) {
        const mapped = data.map((item: Record<string, unknown>) => ({
          id: String(item.id),
          userId: String(item.user_id || ""),
          userName: (item as Record<string, unknown>).profiles
            ? String((item as Record<string, Record<string, string>>).profiles?.full_name || "")
            : String(item.user_name || "Anonymous"),
          userEmail: String(item.user_email || ""),
          title: String(item.title || ""),
          body: String(item.body || ""),
          channel: String(item.channel || "website") as FeedbackEntry["channel"],
          status: String(item.status || "pending") as FeedbackEntry["status"],
          rating: Number(item.star_rating || 0),
          isTestimonial: Boolean(item.is_testimonial),
          verifiedResult: String(item.verified_result || ""),
          adminNote: String(item.admin_note || ""),
          metrics: undefined,
          mediaCount: Number(item.media_count || 0),
          createdAt: String(item.created_at),
          updatedAt: String(item.updated_at || ""),
        }))
        setFeedbacks(mapped)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const selectedFeedback = feedbacks.find((f) => f.id === selectedFeedbackId) || null

  const filtered = feedbacks.filter((f) => {
    if (filters.search && !f.userName.toLowerCase().includes(filters.search.toLowerCase()) && !f.title.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.status !== "all" && f.status !== filters.status) return false
    if (filters.channel !== "all" && f.channel !== filters.channel) return false
    return true
  }).sort((a, b) => {
    if (filters.sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const handleApprove = async (id: string, adminNote?: string) => {
    setFeedbacks((prev) => prev.map((f) => f.id === id ? { ...f, status: "approved" as const, adminNote: adminNote || f.adminNote } : f))
    const { error } = await approveFeedback(id, adminNote)
    if (error) toast.error("Failed to approve")
    else toast.success("Feedback approved")
  }

  const handleReject = async (id: string, adminNote?: string) => {
    setFeedbacks((prev) => prev.map((f) => f.id === id ? { ...f, status: "rejected" as const, adminNote: adminNote || f.adminNote } : f))
    const { error } = await rejectFeedback(id, adminNote)
    if (error) toast.error("Failed to reject")
    else toast.success("Feedback rejected")
  }

  const handleDelete = async (id: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== id))
    try {
      await deleteFeedback(id)
      toast.success("Feedback deleted")
    } catch {
      toast.error("Failed to delete")
    }
  }

  const handleUpdateNote = async (id: string, note: string) => {
    setFeedbacks((prev) => prev.map((f) => f.id === id ? { ...f, adminNote: note } : f))
    try {
      await updateAdminNote(id, note)
    } catch {
      toast.error("Failed to update note")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4f6ef7] border-t-transparent" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <FilterBar />
      <FeedbackTable
        feedbacks={filtered}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
      />
      <FeedbackDrawer
        feedback={selectedFeedback}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
        onUpdateNote={handleUpdateNote}
      />
    </motion.div>
  )
}
