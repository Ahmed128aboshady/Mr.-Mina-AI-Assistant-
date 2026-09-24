-- ====================================================================
--   منصة الكيميائي في العلوم - أ. مينا جرجس
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

-- 4. إدخال حسابات تجريبية أولية لاختبار المنصة
INSERT INTO public.students (username, password, full_name, grade)
VALUES 
  ('student1', '123456', 'أحمد محمد علي', 'الصف الأول الإعدادي'),
  ('student2', '123456', 'مريم جرجس حنا', 'الصف الأول الإعدادي'),
  ('mena_demo', '123456', 'طالب تجريبي (مستر مينا)', 'الصف الأول الإعدادي')
ON CONFLICT (username) DO NOTHING;

-- 💡 ملاحظة لمستر مينا:
-- لإعادة ضبط جهاز أي طالب (إذا غير هاتفه أو الكمبيوتر):
-- ما عليك سوى فتح جدول students في Supabase وحذف القيمة الموجودة في عمود registered_device_id ليصبح NULL
-- أو تنفيذ الأمر البسيط:
-- UPDATE public.students SET registered_device_id = NULL, registered_device_name = NULL WHERE username = 'student1';
