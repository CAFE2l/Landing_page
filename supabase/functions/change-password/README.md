Supabase Edge Function: change-password

Purpose
- Allows a user to change their password securely using a server-side admin key, and revokes existing sessions (best-effort).

Request
- POST / (function endpoint)
- Headers: Authorization: Bearer <user_access_token>
- Body (JSON): { "newPassword": "<new strong password>" }

Environment variables (required)
- SUPABASE_URL: https://<project>.supabase.co
- SUPABASE_SERVICE_ROLE_KEY: service_role key (secret) — must NOT be exposed to clients

Deployment
1. Install the Supabase CLI and login.
2. From repository root: cd supabase/functions/change-password
3. supabase functions deploy change-password --project-ref <project-ref>

Notes and security
- This function must be deployed server-side only. Keep SUPABASE_SERVICE_ROLE_KEY secret.
- The function validates the incoming user's access token and then uses the service_role key to update the password.
- After password update, it attempts to revoke sessions. Depending on Supabase Auth version the revoke endpoint path may differ; review Supabase Auth Admin API docs.

Testing locally
- Use `supabase functions serve` (requires Supabase CLI) and set env vars locally.
- Call the function with a valid Bearer token obtained from the client sign-in flow.
