-- Admin panel migration (chạy sau migration.sql chính)
-- Tạo user admin trên Supabase Auth: email = admin@tinh-bhxh.local, password = AkiraGosho9517
-- Sau đó chạy block "Gán quyền admin" ở cuối file (thay YOUR_ADMIN_UUID).

-- Helper: kiểm tra user hiện tại là admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Mở rộng profiles (member management)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member'
  CHECK (role IN ('member', 'admin', 'vip'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'banned'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Mở rộng feedback (quản lý góp ý)
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'
  CHECK (status IN ('new', 'viewed', 'in_progress', 'resolved'));
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN DEFAULT false;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Cập nhật trigger tạo profile khi đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status, is_vip)
  VALUES (new.id, new.email, 'member', 'active', false)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: Admin quản lý profiles
DROP POLICY IF EXISTS "Admin manages profiles" ON public.profiles;
CREATE POLICY "Admin manages profiles" ON public.profiles
  FOR ALL USING (public.is_admin());

-- RLS: Admin quản lý feedback
DROP POLICY IF EXISTS "Admin manages feedback" ON public.feedback;
CREATE POLICY "Admin manages feedback" ON public.feedback
  FOR ALL USING (public.is_admin());

-- Member đọc profile của mình (giữ policy cũ nếu đã có)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id AND role <> 'admin');

-- Đồng bộ email từ auth.users sang profiles (chạy 1 lần)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Gán quyền admin (chạy 1 lần sau khi tạo user trên Supabase Auth)
-- SELECT id, email FROM auth.users WHERE email = 'admin@tinh-bhxh.local';
-- UPDATE public.profiles SET role = 'admin', status = 'active' WHERE id = 'YOUR_ADMIN_UUID';
