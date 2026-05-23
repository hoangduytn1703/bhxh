-- Fix RLS: cho phép user INSERT vào profiles của chính mình
-- Lỗi: "new row violates row-level security policy for table profiles"
-- Nguyên nhân: chỉ có UPDATE policy, thiếu INSERT policy

-- Xóa policy cũ để viết lại sạch
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin manages profiles" ON public.profiles;

-- SELECT: đọc profile của mình
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- INSERT: user tạo profile của mình lần đầu (khi trigger chưa chạy kịp)
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- UPDATE: user sửa profile của mình (không sửa được role)
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin: quản lý tất cả (cần is_admin() từ setup_profiles_and_admin.sql)
CREATE POLICY "Admin manages profiles" ON public.profiles
  FOR ALL USING (public.is_admin());

-- Đồng bộ tên từ auth.user_metadata vào profiles ngay bây giờ
UPDATE public.profiles p
SET
  full_name = COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    p.full_name
  ),
  phone = COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'phone'), ''),
    p.phone
  ),
  gender = COALESCE(
    CASE
      WHEN u.raw_user_meta_data->>'gender' IN ('male', 'female')
      THEN u.raw_user_meta_data->>'gender'
      ELSE NULL
    END,
    p.gender
  ),
  birth_year = COALESCE(
    CASE
      WHEN u.raw_user_meta_data->>'birthday' IS NOT NULL
        AND u.raw_user_meta_data->>'birthday' != ''
      THEN EXTRACT(YEAR FROM (u.raw_user_meta_data->>'birthday')::date)::integer
      ELSE NULL
    END,
    p.birth_year
  ),
  updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id;

-- Kiểm tra
SELECT id, email, full_name, phone, gender, birth_year, role FROM public.profiles;
