-- Admin đọc quá trình đóng BHXH (user_records) của tất cả thành viên
-- Chạy file này nếu admin thấy "Không đọc được user_records"

-- Bật RLS (nếu chưa)
ALTER TABLE public.user_records ENABLE ROW LEVEL SECURITY;

-- User quản lý record của mình
DROP POLICY IF EXISTS "Users manage own user_records" ON public.user_records;
CREATE POLICY "Users manage own user_records" ON public.user_records
  FOR ALL USING (auth.uid() = user_id);

-- Admin đọc tất cả (cần function is_admin() từ setup_profiles_and_admin.sql)
DROP POLICY IF EXISTS "Admin manages user_records" ON public.user_records;
CREATE POLICY "Admin manages user_records" ON public.user_records
  FOR ALL USING (public.is_admin());

-- Kiểm tra có data không
SELECT user_id, updated_at FROM public.user_records ORDER BY updated_at DESC LIMIT 5;
