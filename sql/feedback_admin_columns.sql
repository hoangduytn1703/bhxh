-- Chạy file này khi admin /feedback báo lỗi:
-- "column feedback.is_highlighted does not exist"
-- (Bảng feedback đã có dữ liệu nhưng chưa có cột quản trị)

ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN DEFAULT false;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Gán status cho dòng cũ (nếu NULL)
UPDATE public.feedback SET status = 'new' WHERE status IS NULL;
UPDATE public.feedback SET is_highlighted = false WHERE is_highlighted IS NULL;

-- RLS: admin đọc/sửa/xóa góp ý (cần function is_admin từ setup_profiles_and_admin.sql)
DROP POLICY IF EXISTS "Admin manages feedback" ON public.feedback;
CREATE POLICY "Admin manages feedback" ON public.feedback
  FOR ALL USING (public.is_admin());

-- Kiểm tra
SELECT id, full_name, status, is_highlighted, created_at FROM public.feedback ORDER BY created_at DESC;
