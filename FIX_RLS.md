# 🔧 FIX: Corrigir Política RLS para INSERT

O erro `'new row violates row-level security policy'` ocorre porque a política de INSERT não está validando corretamente.

## Solução:

Execute este SQL no Supabase Dashboard (SQL Editor):

```sql
-- Drop the old problematic policy
drop policy if exists "Authenticated users can insert" on feedback_posts;

-- Create a new policy that allows authenticated users to insert their own posts
create policy "Authenticated users can insert"
  on feedback_posts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Also ensure there's a select policy for the user to see their own pending posts
drop policy if exists "Users can view own posts" on feedback_posts;
create policy "Users can view own posts"
  on feedback_posts for select
  to authenticated
  using (auth.uid() = user_id or status in ('approved', 'highlighted'));
```

**Passos:**
1. Vá para: https://app.supabase.com/project/iuzvmlhowqghbbduhmzt/sql/new
2. Cole o SQL acima
3. Clique em "Run"
4. Pronto! ✅

Agora tente criar um feedback novamente!
