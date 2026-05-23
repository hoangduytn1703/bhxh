-- Migration cho Ứng dụng Tính BHXH

-- 1. profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  birth_year INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật RLS cho profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. contribution_periods table
CREATE TABLE public.contribution_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  type TEXT CHECK (type IN ('bhxh', 'bhtn')) NOT NULL,
  start_month INTEGER NOT NULL,
  start_year INTEGER NOT NULL,
  end_month INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  salary NUMERIC NOT NULL,
  contribution_type TEXT CHECK (contribution_type IN ('mandatory', 'voluntary')) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật RLS cho contribution_periods
ALTER TABLE public.contribution_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own periods" ON contribution_periods
  FOR ALL USING (auth.uid() = user_id);

-- 3. calculation_results table
CREATE TABLE public.calculation_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  calculation_type TEXT CHECK (calculation_type IN ('bhxh_one_time', 'pension', 'unemployment')) NOT NULL,
  input_data JSONB NOT NULL,
  result_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật RLS cho calculation_results
ALTER TABLE public.calculation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own results" ON calculation_results
  FOR ALL USING (auth.uid() = user_id);

-- 4. imported_files table
CREATE TABLE public.imported_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT,
  parsed_data JSONB,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật RLS cho imported_files
ALTER TABLE public.imported_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own files" ON imported_files
  FOR ALL USING (auth.uid() = user_id);

-- 5. feedback table (Phase 2 — Hộp thư góp ý)
CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),        -- NULL nếu chưa đăng nhập
  full_name TEXT NOT NULL,
  age INTEGER CHECK (age >= 10 AND age <= 100),
  email TEXT,
  occupation TEXT,
  category TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật RLS cho feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Ai cũng có thể gửi góp ý (kể cả chưa đăng nhập)
CREATE POLICY "Anyone can insert feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- Chỉ admin / service_role mới đọc được (không mở SELECT cho user thường)
-- Nếu muốn user đọc góp ý của mình, thêm policy sau:
-- CREATE POLICY "Users can read own feedback" ON feedback
--   FOR SELECT USING (auth.uid() = user_id);

-- Trigger auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
