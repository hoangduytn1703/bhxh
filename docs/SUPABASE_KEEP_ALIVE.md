# Supabase keep-alive (2 lần / ngày)

Project Supabase free tier có thể **tạm dừng (pause)** khi không có truy vấn trong một thời gian. Cron ping DB giúp giảm tình trạng “pending” khi user quay lại.

## Bước 1 — SQL (chạy 1 lần)

Trong **Supabase → SQL Editor**, chạy file:

`sql/health_ping.sql`

## Bước 2 — GitHub Actions (khuyến nghị)

1. Đẩy repo lên GitHub.
2. **Settings → Secrets and variables → Actions**, thêm:
   - `SUPABASE_URL` — ví dụ `https://xxxxx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` — **service_role** (Settings → API), không dùng anon key.
3. Workflow `.github/workflows/supabase-keep-alive.yml` tự chạy:
   - **08:00** và **20:00** giờ Việt Nam (cron UTC 01:00 và 13:00).
4. Có thể chạy thử tay: **Actions → Supabase keep-alive → Run workflow**.

Lần ping đầu sau khi project đang pause có thể mất ~30–60s để DB thức dậy; lần sau sẽ nhanh hơn.

## Tùy chọn — Supabase Edge Function

Nếu đã cài [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase functions deploy keep-alive --no-verify-jwt
```

Trong **Dashboard → Edge Functions → keep-alive → Cron**, thêm lịch (ví dụ `0 1,13 * * *` UTC) hoặc gọi URL function từ cron ngoài (cron-job.org) với header `Authorization: Bearer <CRON_SECRET>` nếu đã set secret `CRON_SECRET`.

## Bảo mật

- Không commit `service_role` vào git.
- Chỉ dùng `health_ping()` (trả về `now()`), không đọc dữ liệu nhạy cảm.
