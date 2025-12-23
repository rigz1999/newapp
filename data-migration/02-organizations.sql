-- ============================================
-- DATA MIGRATION: organizations
-- ============================================

INSERT INTO organizations (id, name, owner_id, created_at) VALUES
('926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Organization 1', '50f8320d-29f8-48a4-8da3-05aef1288db0', '2025-11-04 22:43:54.176161+00'),
('af35de1e-2bd6-4930-9a1a-1f4d59580093', 'Finixar', '50f8320d-29f8-48a4-8da3-05aef1288db0', '2025-12-11 12:32:56.813933+00');

-- Verify
SELECT COUNT(*) as total_organizations FROM organizations;
