/**
 * /api/webhooks/paypal
 *
 * Serverless adapter for platforms that support /api routes.
 * It forwards the PayPal webhook payload and signature headers to the
 * Supabase Edge Function `paypal-webhook`, which verifies the signature
 * and updates service_orders.
 *
 * Env var:
 *  - SUPABASE_PAYPAL_WEBHOOK_URL=https://<project>.supabase.co/functions/v1/paypal-webhook
 */

type ApiRequest = {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
  end: () => void
}

function readHeader(req: ApiRequest, name: string): string {
  const value = req.headers[name.toLowerCase()] || req.headers[name]
  return Array.isArray(value) ? value[0] || "" : value || ""
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "content-type, paypal-auth-algo, paypal-cert-url, paypal-transmission-id, paypal-transmission-sig, paypal-transmission-time")

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const webhookUrl = process.env.SUPABASE_PAYPAL_WEBHOOK_URL
  if (!webhookUrl) {
    res.status(500).json({ error: "SUPABASE_PAYPAL_WEBHOOK_URL is not configured" })
    return
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "paypal-auth-algo": readHeader(req, "paypal-auth-algo"),
      "paypal-cert-url": readHeader(req, "paypal-cert-url"),
      "paypal-transmission-id": readHeader(req, "paypal-transmission-id"),
      "paypal-transmission-sig": readHeader(req, "paypal-transmission-sig"),
      "paypal-transmission-time": readHeader(req, "paypal-transmission-time"),
    },
    body: typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}),
  })

  const body = await response.json().catch(() => ({ received: response.ok }))
  res.status(response.status).json(body)
}
