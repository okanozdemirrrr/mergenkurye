-- approved_by foreign key constraint'ini kaldır (geçici çözüm)
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_approved_by_fkey;

-- Veya approved_by alanını nullable yap
ALTER TABLE applications ALTER COLUMN approved_by DROP NOT NULL;