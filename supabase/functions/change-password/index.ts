/**
 * Supabase Edge Function: change-password
 *
 * Behavior:
 * - Expects Authorization: Bearer <access_token> (user's access token)
 * - POST JSON body: { newPassword: string }
 * - Validates the access token by calling /auth/v1/user
 * - Uses SUPABASE_SERVICE_ROLE_KEY to call the Admin endpoint and update the user's password
 * - Attempts to revoke user sessions (best-effort, depends on Auth API availability)
 *
 * Required env vars when deployed:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Deploy: place under /supabase/functions/change-password and `supabase functions deploy change-password` (see Supabase docs)
 */

export default async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL")
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !serviceRole) {
      return new Response(JSON.stringify({ error: "Server misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing" }), { status: 500 })
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
    }

    const authHeader = req.headers.get("authorization") || ""
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization header with Bearer token" }), { status: 401 })
    }

    // Validate access token and obtain user info
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader },
    })

    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Invalid or expired user token" }), { status: 401 })
    }

    const user = await userResp.json()
    const body = await req.json().catch(() => ({}))
    const newPassword = (body && body.newPassword) ? String(body.newPassword) : ""

    if (!newPassword || newPassword.length < 8) {
      return new Response(JSON.stringify({ error: "Password too weak or missing (min 8 chars)" }), { status: 400 })
    }

    // Update password using service role (admin privilege)
    const updateResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify({ password: newPassword }),
    })

    if (!updateResp.ok) {
      const detail = await updateResp.text().catch(() => "")
      return new Response(JSON.stringify({ error: "Failed to update password (admin)", detail }), { status: 500 })
    }

    // Best-effort: attempt to revoke existing sessions so old tokens stop working.
    // Supabase exposes various admin endpoints; depending on server version this path might differ.
    try {
      // Common admin revoke endpoint; if unsupported this will be ignored.
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceRole}` },
      })
    } catch (err) {
      // ignore revoke errors; password already updated
      console.warn("session revoke failed:", err)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: "Unexpected error", message }), { status: 500 })
  }
}
