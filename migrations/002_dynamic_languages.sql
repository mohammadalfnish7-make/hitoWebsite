-- ============================================================
-- Hito Health Tourism — Dynamic Language Support
-- Migration: 002_dynamic_languages.sql
-- Run as: hito_admin (DDL user)
-- ============================================================

-- 1. Add JSONB columns for names to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS names JSONB DEFAULT '{}'::jsonb;

-- Migrate data for services
UPDATE services SET names = jsonb_build_object(
    'en', name_en,
    'ar', COALESCE(name_ar, '')
) WHERE names = '{}'::jsonb;

-- 2. Add JSONB columns for names to sub_services
ALTER TABLE sub_services ADD COLUMN IF NOT EXISTS names JSONB DEFAULT '{}'::jsonb;

-- Migrate data for sub_services
UPDATE sub_services SET names = jsonb_build_object(
    'en', name_en,
    'ar', COALESCE(name_ar, '')
) WHERE names = '{}'::jsonb;

-- 3. Add JSONB columns for names, specialties, and bios to doctors
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS names JSONB DEFAULT '{}'::jsonb;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '{}'::jsonb;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bios JSONB DEFAULT '{}'::jsonb;

-- Migrate data for doctors
UPDATE doctors SET names = jsonb_build_object(
    'en', name_en,
    'ar', COALESCE(name_ar, '')
) WHERE names = '{}'::jsonb;

UPDATE doctors SET specialties = jsonb_build_object(
    'en', COALESCE(specialty_en, ''),
    'ar', COALESCE(specialty_ar, '')
) WHERE specialties = '{}'::jsonb;

UPDATE doctors SET bios = jsonb_build_object(
    'en', COALESCE(bio_en, ''),
    'ar', COALESCE(bio_ar, '')
) WHERE bios = '{}'::jsonb;

-- 4. Add JSONB columns for titles to sub_service_steps
ALTER TABLE sub_service_steps ADD COLUMN IF NOT EXISTS titles JSONB DEFAULT '{}'::jsonb;

-- Migrate data for sub_service_steps
UPDATE sub_service_steps SET titles = jsonb_build_object(
    'en', COALESCE(title_en, ''),
    'ar', COALESCE(title_ar, '')
) WHERE titles = '{}'::jsonb;

-- 5. Seed Translations for the UI
INSERT INTO translations (key, locale, value, is_verified) VALUES
-- Header
('header.home', 'en', 'Home', true),
('header.home', 'ar', 'الرئيسية', true),
('header.services', 'en', 'Services', true),
('header.services', 'ar', 'الخدمات', true),
('header.privacy', 'en', 'Privacy', true),
('header.privacy', 'ar', 'الخصوصية', true),
('header.search_placeholder', 'en', 'Search services, treatments, doctors...', true),
('header.search_placeholder', 'ar', 'بحث خدمات، علاجات، أطباء...', true),
('header.search_button', 'en', 'Search', true),
('header.search_button', 'ar', 'بحث', true),

-- Footer
('footer.home', 'en', 'Home', true),
('footer.home', 'ar', 'الرئيسية', true),
('footer.services', 'en', 'Services', true),
('footer.services', 'ar', 'الخدمات', true),
('footer.privacy', 'en', 'Privacy & Data Deletion', true),
('footer.privacy', 'ar', 'سياسة الخصوصية وحذف البيانات', true),
('footer.copyright', 'en', 'All rights reserved.', true),
('footer.copyright', 'ar', 'جميع الحقوق محفوظة.', true),

-- Home Page - Hero
('home.hero.badge', 'en', '🏥 Welcome to the UAE', true),
('home.hero.badge', 'ar', '🏥 مرحباً بك في الإمارات', true),
('home.hero.title', 'en', 'Your Health Journey Starts in Dubai', true),
('home.hero.title', 'ar', 'رحلتك الصحية تبدأ من دبي', true),
('home.hero.subtitle', 'en', 'World-class medical treatments with personalized care in the heart of the UAE', true),
('home.hero.subtitle', 'ar', 'خدمات طبية عالمية المستوى مع رعاية شخصية في قلب الإمارات', true),
('home.hero.button.primary', 'en', 'Explore Our Services', true),
('home.hero.button.primary', 'ar', 'استكشف خدماتنا', true),
('home.hero.button.secondary', 'en', 'Learn More', true),
('home.hero.button.secondary', 'ar', 'تعرف علينا', true),

-- Home Page - Stats
('home.stats.patients.label', 'en', 'Happy Patients', true),
('home.stats.patients.label', 'ar', 'مريض سعيد', true),
('home.stats.doctors.label', 'en', 'Specialist Doctors', true),
('home.stats.doctors.label', 'ar', 'طبيب متخصص', true),
('home.stats.experience.label', 'en', 'Years of Experience', true),
('home.stats.experience.label', 'ar', 'سنوات خبرة', true),
('home.stats.satisfaction.label', 'en', 'Patient Satisfaction', true),
('home.stats.satisfaction.label', 'ar', 'رضا المرضى', true),

-- Home Page - Services
('home.services.title', 'en', 'Our Medical Services', true),
('home.services.title', 'ar', 'خدماتنا الطبية', true),
('home.services.subtitle', 'en', 'A comprehensive range of treatments delivered to the highest international standards', true),
('home.services.subtitle', 'ar', 'نقدم مجموعة شاملة من العلاجات الطبية بأعلى المعايير العالمية', true),
('home.services.dental.title', 'en', 'Dental Care', true),
('home.services.dental.title', 'ar', 'طب الأسنان', true),
('home.services.dental.desc', 'en', 'Hollywood smile, implants, orthodontics & advanced treatments', true),
('home.services.dental.desc', 'ar', 'ابتسامة هوليوود، زراعة الأسنان، تقويم وعلاجات متقدمة', true),
('home.services.cosmetic.title', 'en', 'Cosmetic Surgery', true),
('home.services.cosmetic.title', 'ar', 'الجراحة التجميلية', true),
('home.services.cosmetic.desc', 'en', 'Latest techniques with natural, stunning results', true),
('home.services.cosmetic.desc', 'ar', 'عمليات تجميل بأحدث التقنيات مع نتائج طبيعية', true),
('home.services.fertility.title', 'en', 'Fertility Treatments', true),
('home.services.fertility.title', 'ar', 'علاجات الخصوبة', true),
('home.services.fertility.desc', 'en', 'Comprehensive fertility solutions with top success rates', true),
('home.services.fertility.desc', 'ar', 'حلول متكاملة للخصوبة مع أعلى معدلات النجاح', true),
('home.services.ortho.title', 'en', 'Orthopedic Surgery', true),
('home.services.ortho.title', 'ar', 'جراحة العظام', true),
('home.services.ortho.desc', 'en', 'Joint replacements & advanced sports medicine', true),
('home.services.ortho.desc', 'ar', 'استبدال المفاصل والعلاجات الرياضية المتقدمة', true),

-- Home Page - Why Us
('home.why.image_alt', 'en', 'Luxury hotel in Dubai', true),
('home.why.image_alt', 'ar', 'فندق فاخر في دبي', true),
('home.why.title', 'en', 'Why Choose Dubai for Treatment?', true),
('home.why.title', 'ar', 'لماذا تختار دبي للعلاج؟', true),
('home.why.feature1.title', 'en', 'Internationally Accredited Doctors', true),
('home.why.feature1.title', 'ar', 'أطباء معتمدون دولياً', true),
('home.why.feature1.desc', 'en', 'Our team consists of top doctors certified by global institutions', true),
('home.why.feature1.desc', 'ar', 'فريقنا من أفضل الأطباء المعتمدين من مؤسسات عالمية', true),
('home.why.feature2.title', 'en', 'Competitive Pricing', true),
('home.why.feature2.title', 'ar', 'أسعار تنافسية', true),
('home.why.feature2.desc', 'en', 'Save up to 60% compared to Western countries with the same quality', true),
('home.why.feature2.desc', 'ar', 'وفّر حتى 60% مقارنة بالدول الغربية مع نفس الجودة', true),
('home.why.feature3.title', 'en', 'All-Inclusive Packages', true),
('home.why.feature3.title', 'ar', 'باقات سياحية متكاملة', true),
('home.why.feature3.desc', 'en', 'Luxury hotel stays, transfers, and post-treatment follow-ups', true),
('home.why.feature3.desc', 'ar', 'إقامة فندقية فاخرة، نقل، ومتابعة بعد العلاج', true),
('home.why.feature4.title', 'en', 'Multilingual Support', true),
('home.why.feature4.title', 'ar', 'دعم متعدد اللغات', true),
('home.why.feature4.desc', 'en', '24/7 support team in Arabic and English', true),
('home.why.feature4.desc', 'ar', 'فريق دعم بالعربية والإنجليزية على مدار الساعة', true),

-- Home Page - CTA
('home.cta.image_alt', 'en', 'Dubai at night', true),
('home.cta.image_alt', 'ar', 'دبي ليلاً', true),
('home.cta.title', 'en', 'Ready to Start Your Health Journey?', true),
('home.cta.title', 'ar', 'هل أنت مستعد لبدء رحلتك الصحية؟', true),
('home.cta.subtitle', 'en', 'Contact us today for a free consultation and a personalized treatment plan', true),
('home.cta.subtitle', 'ar', 'تواصل معنا اليوم للحصول على استشارة مجانية وخطة علاج مخصصة', true),
('home.cta.button', 'en', 'Book Your Free Consultation', true),
('home.cta.button', 'ar', 'احجز استشارتك المجانية', true),

-- Services Page
('services.title', 'en', 'Our Services', true),
('services.title', 'ar', 'خدماتنا', true),
('services.subtitle', 'en', 'Discover our premium health tourism services in the UAE', true),
('services.subtitle', 'ar', 'اكتشف خدمات السياحة العلاجية المتميزة لدينا', true),
('services.learn_more', 'en', 'Learn more', true),
('services.learn_more', 'ar', 'اعرف المزيد', true),

-- Service Detail Page
('service_detail.sub_services.title', 'en', 'Available Treatments', true),
('service_detail.sub_services.title', 'ar', 'الخدمات الفرعية', true),
('service_detail.from', 'en', 'From', true),
('service_detail.from', 'ar', 'من', true),

-- Sub-Service Detail Page
('sub_service_detail.cost.title', 'en', 'Cost Estimate', true),
('sub_service_detail.cost.title', 'ar', 'تقدير التكلفة', true),
('sub_service_detail.cost.in_uae', 'en', 'In UAE', true),
('sub_service_detail.cost.in_uae', 'ar', 'في الإمارات', true),
('sub_service_detail.cost.in_home', 'en', 'In Your Country', true),
('sub_service_detail.cost.in_home', 'ar', 'في بلدك', true),
('sub_service_detail.doctors.title', 'en', 'Our Doctors', true),
('sub_service_detail.doctors.title', 'ar', 'أطباؤنا', true),
('sub_service_detail.doctors.primary', 'en', 'Lead Doctor', true),
('sub_service_detail.doctors.primary', 'ar', 'الطبيب الرئيسي', true)
ON CONFLICT (key, locale) DO UPDATE SET value = EXCLUDED.value;
