# Thiết lập Admin Panel

## 1. Chạy SQL

**Lỗi `relation "public.profiles" does not exist`** = bạn chưa tạo bảng `profiles`.  
Đừng chạy `UPDATE profiles` trước — chạy script tạo bảng trước.

### Cách nhanh (đã có `user_records`, `feedback` nhưng chưa có `profiles`)

1. Mở `sql/setup_profiles_and_admin.sql`
2. Sửa UUID ở bước 7 nếu cần (lấy từ Authentication → Users)
3. Chạy **cả file** trong SQL Editor → Run

### Cách đầy đủ (database mới, chưa có bảng nào)

1. `sql/migration.sql`
2. `sql/admin_migration.sql`
3. Rồi mới `UPDATE ... role = 'admin'`

### Góp ý có trên DB nhưng admin không tải được

Lỗi Network: `column feedback.is_highlighted does not exist`  
→ Chạy **`sql/feedback_admin_columns.sql`** (thêm cột `status`, `is_highlighted`, … — **không xóa** dòng cũ).

## 2. Tạo tài khoản admin

1. Vào **Authentication → Users → Add user**
2. Email: `admin@tinh-bhxh.local` (hoặc email bạn đặt trong `.env`)
3. Password: `AkiraGosho9517`
4. Copy UUID user vừa tạo
5. Chạy SQL:

```sql
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE id = 'PASTE_ADMIN_UUID_HERE';
```

## 3. Cấu hình `.env`

```env
VITE_ADMIN_EMAIL=admin@tinh-bhxh.local
```

## 4. Đăng nhập admin

- URL: `/admin/login`
- **Tên đăng nhập:** gõ `admin` *hoặc* email Supabase (vd. `akiragosho2000@gmail.com`)
- **Mật khẩu:** mật khẩu Supabase Auth của tài khoản đó (không phải chữ "admin")
- Đặt mật khẩu `AkiraGosho9517`: Supabase → **Authentication → Users** → chọn user → **Send password recovery** hoặc **Reset password** (nếu có), hoặc xóa user và tạo lại với mật khẩu đó.
- Nếu nút login **quay mãi**: đã sửa lỗi deadlock Supabase — pull code mới và `npm run dev` lại.
- `.env` phải có `VITE_ADMIN_EMAIL=` trùng email admin (khi gõ `admin` thì app dùng email này)

## Tính năng

| Trang | Đường dẫn | Mô tả |
|-------|-----------|--------|
| Thành viên | `/admin/members` | Ban / gỡ ban, cấp / gỡ VIP |
| Góp ý | `/admin/feedback` | Xem, sửa trạng thái, highlight, xóa |

Member bị ban sẽ bị đăng xuất và không đăng nhập lại được.

### Tên thành viên / quá trình đóng BHXH

- Tên hiển thị lấy từ `profiles.full_name` (đồng bộ khi user lưu Hồ sơ).
- Thành viên cũ chưa có tên: chạy **`sql/sync_profiles_from_auth.sql`**.
- Xem quá trình đóng trên admin: chạy **`sql/admin_user_records_policy.sql`**.
