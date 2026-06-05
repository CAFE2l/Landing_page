# 🔧 SOLUÇÃO FINAL: Remover todas as políticas RLS e criar uma funcional

O problema é que as políticas RLS estão muito restritivas. Vamos **resetar e criar uma politica simples** que funciona.

## Execute este SQL no Supabase Dashboard:

```sql
-- First, disable RLS temporarily to see if that's the issue
ALTER TABLE feedback_posts DISABLE ROW LEVEL SECURITY;

-- Now enable it again with simpler policies
ALTER TABLE feedback_posts ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Public can view approved" ON feedback_posts;
DROP POLICY IF EXISTS "Authenticated users can insert" ON feedback_posts;
DROP POLICY IF EXISTS "Admin can manage all feedback" ON feedback_posts;
DROP POLICY IF EXISTS "Users can update own pending posts" ON feedback_posts;
DROP POLICY IF EXISTS "Users can delete own pending posts" ON feedback_posts;
DROP POLICY IF EXISTS "Users can view own posts" ON feedback_posts;

-- Create ONE simple policy: Allow authenticated users to do everything with their own posts
CREATE POLICY "authenticated_crud_own_posts"
  ON feedback_posts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for public to view approved posts
CREATE POLICY "public_view_approved"
  ON feedback_posts
  FOR SELECT
  TO public
  USING (status IN ('approved', 'highlighted'));

-- Create policy for admin to manage all
CREATE POLICY "admin_manage_all"
  ON feedback_posts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.role = 'admin'
    )
  );
```

**Passos:**
1. Vá para: https://app.supabase.com/project/iuzvmlhowqghbbduhmzt/sql/new
2. **Cole TODO o SQL acima**
3. Clique em "Run"
4. Aguarde até ver ✅ "Success"
5. Tente criar um feedback novamente

---

## Se ainda não funcionar:

Execute este SQL também para verificar/resetar tudo:

```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'feedback_posts';

-- If nothing works, as a last resort, you can disable RLS completely (NOT recommended for production)
-- ALTER TABLE feedback_posts DISABLE ROW LEVEL SECURITY;
```

Avisa se funcionou! 🚀
