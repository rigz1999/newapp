-- ============================================
-- STEP 1: Drop FK Constraint on Profiles
-- Run this in Paris SQL Editor first
-- ============================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ============================================
-- STEP 2: Insert Profiles Data
-- ============================================

INSERT INTO profiles (id, email, full_name, created_at, updated_at, is_superadmin) VALUES
('d6fd18f8-a98b-4e01-be16-81f44c972034', 'makhasalma@gmail.com', 'Salma Makha', '2025-11-10 19:15:21.464967+00', '2025-11-10 19:16:37.317+00', false),
('adb8d627-f5a9-4eb8-93bc-cdc72c24eba7', 'ayman.zrig@gmail.com', 'Ayman Zrig', '2025-11-23 16:43:03.46125+00', '2025-11-23 16:43:03.46125+00', false),
('00f94247-662a-475b-813d-a6dc5bad60f7', 'maxime.roger91@gmail.com', 'Maxime Roger', '2025-12-12 10:39:27.931+00', '2025-12-12 10:39:27.931+00', false),
('50f8320d-29f8-48a4-8da3-05aef1288db0', 'zrig.ayman@gmail.com', 'Ayman Zrig', '2025-11-05 08:54:20.201118+00', '2025-11-11 23:40:50.631+00', true);

-- Verify
SELECT COUNT(*) as total_profiles FROM profiles;
