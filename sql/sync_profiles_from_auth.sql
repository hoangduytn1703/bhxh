-- Đồng bộ tên / giới tính từ auth.user_metadata sang profiles (chạy 1 lần)
-- Dùng khi admin thấy "Chưa cập nhật tên" dù user đã sửa hồ sơ trước đó

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
  updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id;

SELECT id, email, full_name, gender, birth_year FROM public.profiles WHERE role <> 'admin' OR role IS NULL;
