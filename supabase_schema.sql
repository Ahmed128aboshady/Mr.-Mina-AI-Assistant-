-- ====================================================================
--   منصة الخيميائي في العلوم - أ. مينا جرجس
--   قاعدة بيانات الطلاب ونظام الحماية: جهاز واحد فقط لكل حساب
--   Supabase Database Schema & Security Policies
-- ====================================================================

-- 1. إنشاء جدول الطلاب (Students Table)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    grade TEXT DEFAULT 'الصف الأول الإعدادي',
    phone TEXT,
    
    -- حقول حماية وتثبيت الجهاز (Strict Single-Device Lock)
    registered_device_id TEXT DEFAULT NULL,
    registered_device_name TEXT DEFAULT NULL,
    registered_at TIMESTAMPTZ DEFAULT NULL,
    last_login TIMESTAMPTZ DEFAULT NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهرس سريع للبحث باسم المستخدم
CREATE INDEX IF NOT EXISTS idx_students_username ON public.students (username);

-- 2. إنشاء جدول سجل نشاطات الطلاب (Student Activity Log)
CREATE TABLE IF NOT EXISTS public.student_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_username TEXT,
    activity_type TEXT NOT NULL, -- 'login', 'quiz', 'lab_view', 'lesson_view'
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. تفعيل نظام أمان الصفوف (Row Level Security - RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_activity ENABLE ROW LEVEL SECURITY;

-- حذف السياسات السابقة إن وُجدت لإعادة الإنشاء بنظافة
DROP POLICY IF EXISTS "Allow anon read for student login" ON public.students;
DROP POLICY IF EXISTS "Allow anon update for student device binding" ON public.students;
DROP POLICY IF EXISTS "Allow anon insert for activity" ON public.student_activity;
DROP POLICY IF EXISTS "Allow anon select for activity" ON public.student_activity;

-- سياسة السماح لمتصفح الطالب بالقراءة للتحقق من بيانات الدخول
CREATE POLICY "Allow anon read for student login" 
ON public.students FOR SELECT 
TO anon, authenticated
USING (true);

-- سياسة السماح لمتصفح الطالب بتحديث جهازه عند أول تسجيل وتحديث آخر وقت دخول
CREATE POLICY "Allow anon update for student device binding" 
ON public.students FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- سياسة السماح بتسجيل نشاطات الطلاب
CREATE POLICY "Allow anon insert for activity" 
ON public.student_activity FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon select for activity" 
ON public.student_activity FOR SELECT 
TO anon, authenticated
USING (true);

-- 4. إدخال حسابات الـ 50 طالباً والحساب الإداري
INSERT INTO public.students (username, password, full_name, grade)
VALUES 
  ('admin', 'admin', 'أ. مينا جرجس (المدير)', 'الإدارة العامة'),
  ('mena_demo', '123456', 'طالب تجريبي (مستر مينا)', 'الصف الأول الإعدادي'),
  ('Student 1', 'mina2001', 'طالب 1', 'الصف الأول الإعدادي'),
  ('Student 2', 'mina2002', 'طالب 2', 'الصف الأول الإعدادي'),
  ('Student 3', 'mina2003', 'طالب 3', 'الصف الأول الإعدادي'),
  ('Student 4', 'mina2004', 'طالب 4', 'الصف الأول الإعدادي'),
  ('Student 5', 'mina2005', 'طالب 5', 'الصف الأول الإعدادي'),
  ('Student 6', 'mina2006', 'طالب 6', 'الصف الأول الإعدادي'),
  ('Student 7', 'mina2007', 'طالب 7', 'الصف الأول الإعدادي'),
  ('Student 8', 'mina2008', 'طالب 8', 'الصف الأول الإعدادي'),
  ('Student 9', 'mina2009', 'طالب 9', 'الصف الأول الإعدادي'),
  ('Student 10', 'mina2010', 'طالب 10', 'الصف الأول الإعدادي'),
  ('Student 11', 'mina2011', 'طالب 11', 'الصف الأول الإعدادي'),
  ('Student 12', 'mina2012', 'طالب 12', 'الصف الأول الإعدادي'),
  ('Student 13', 'mina2013', 'طالب 13', 'الصف الأول الإعدادي'),
  ('Student 14', 'mina2014', 'طالب 14', 'الصف الأول الإعدادي'),
  ('Student 15', 'mina2015', 'طالب 15', 'الصف الأول الإعدادي'),
  ('Student 16', 'mina2016', 'طالب 16', 'الصف الأول الإعدادي'),
  ('Student 17', 'mina2017', 'طالب 17', 'الصف الأول الإعدادي'),
  ('Student 18', 'mina2018', 'طالب 18', 'الصف الأول الإعدادي'),
  ('Student 19', 'mina2019', 'طالب 19', 'الصف الأول الإعدادي'),
  ('Student 20', 'mina2020', 'طالب 20', 'الصف الأول الإعدادي'),
  ('Student 21', 'mina2021', 'طالب 21', 'الصف الأول الإعدادي'),
  ('Student 22', 'mina2022', 'طالب 22', 'الصف الأول الإعدادي'),
  ('Student 23', 'mina2023', 'طالب 23', 'الصف الأول الإعدادي'),
  ('Student 24', 'mina2024', 'طالب 24', 'الصف الأول الإعدادي'),
  ('Student 25', 'mina2025', 'طالب 25', 'الصف الأول الإعدادي'),
  ('Student 26', 'mina2026', 'طالب 26', 'الصف الأول الإعدادي'),
  ('Student 27', 'mina2027', 'طالب 27', 'الصف الأول الإعدادي'),
  ('Student 28', 'mina2028', 'طالب 28', 'الصف الأول الإعدادي'),
  ('Student 29', 'mina2029', 'طالب 29', 'الصف الأول الإعدادي'),
  ('Student 30', 'mina2030', 'طالب 30', 'الصف الأول الإعدادي'),
  ('Student 31', 'mina2031', 'طالب 31', 'الصف الأول الإعدادي'),
  ('Student 32', 'mina2032', 'طالب 32', 'الصف الأول الإعدادي'),
  ('Student 33', 'mina2033', 'طالب 33', 'الصف الأول الإعدادي'),
  ('Student 34', 'mina2034', 'طالب 34', 'الصف الأول الإعدادي'),
  ('Student 35', 'mina2035', 'طالب 35', 'الصف الأول الإعدادي'),
  ('Student 36', 'mina2036', 'طالب 36', 'الصف الأول الإعدادي'),
  ('Student 37', 'mina2037', 'طالب 37', 'الصف الأول الإعدادي'),
  ('Student 38', 'mina2038', 'طالب 38', 'الصف الأول الإعدادي'),
  ('Student 39', 'mina2039', 'طالب 39', 'الصف الأول الإعدادي'),
  ('Student 40', 'mina2040', 'طالب 40', 'الصف الأول الإعدادي'),
  ('Student 41', 'mina2041', 'طالب 41', 'الصف الأول الإعدادي'),
  ('Student 42', 'mina2042', 'طالب 42', 'الصف الأول الإعدادي'),
  ('Student 43', 'mina2043', 'طالب 43', 'الصف الأول الإعدادي'),
  ('Student 44', 'mina2044', 'طالب 44', 'الصف الأول الإعدادي'),
  ('Student 45', 'mina2045', 'طالب 45', 'الصف الأول الإعدادي'),
  ('Student 46', 'mina2046', 'طالب 46', 'الصف الأول الإعدادي'),
  ('Student 47', 'mina2047', 'طالب 47', 'الصف الأول الإعدادي'),
  ('Student 48', 'mina2048', 'طالب 48', 'الصف الأول الإعدادي'),
  ('Student 49', 'mina2049', 'طالب 49', 'الصف الأول الإعدادي'),
  ('Student 50', 'mina2050', 'طالب 50', 'الصف الأول الإعدادي')
ON CONFLICT (username) DO UPDATE
SET password = EXCLUDED.password,
    full_name = EXCLUDED.full_name,
    grade = EXCLUDED.grade;

-- 💡 ملاحظة لمستر مينا:
-- لإعادة ضبط جهاز أي طالب (إذا غير هاتفه أو الكمبيوتر):
-- ما عليك سوى فتح جدول students في Supabase وحذف القيمة الموجودة في عمود registered_device_id ليصبح NULL
-- أو تنفيذ الأمر البسيط في الـ SQL Editor:
-- UPDATE public.students SET registered_device_id = NULL, registered_device_name = NULL WHERE username = 'Student 1';
