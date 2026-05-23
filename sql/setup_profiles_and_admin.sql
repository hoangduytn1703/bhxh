-- Chạy file này TRƯỚC khi UPDATE role admin.
-- Dùng khi gặp lỗi: relation "public.profiles" does not exist

-- 1) Tạo bảng profiles (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  birth_year INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female')),
  email TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'vip')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  is_vip BOOLEAN DEFAULT false,
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2) Policies cơ bản (bỏ qua nếu đã tồn tại)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id AND COALESCE(role, 'member') <> 'admin');

-- 3) is_admin() + policy admin (cần cho trang /admin)
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

DROP POLICY IF EXISTS "Admin manages profiles" ON public.profiles;
CREATE POLICY "Admin manages profiles" ON public.profiles
  FOR ALL USING (public.is_admin());

-- 4) Trigger: tạo profile khi user mới đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status, is_vip)
  VALUES (new.id, new.email, 'member', 'active', false)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5) Tạo profile cho MỌI user Auth hiện có (kể cả admin vừa tạo)
INSERT INTO public.profiles (id, email, role, status, is_vip)
SELECT u.id, u.email, 'member', 'active', false
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- 6) Đồng bộ email
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 7) Gán admin — ĐỔI UUID nếu khác
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE id = '470e0e68-6225-40e8-8f3b-ede3af9f5773';

-- Kiểm tra
SELECT id, email, role, status FROM public.profiles WHERE role = 'admin';
