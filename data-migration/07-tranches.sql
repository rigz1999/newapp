-- ============================================
-- DATA MIGRATION: tranches
-- ============================================

INSERT INTO tranches (id, tranche_name, projet_id, date_emission, date_echeance, created_at, date_transfert_fonds, taux_nominal, periodicite_coupons, date_echeance_finale, duree_mois, updated_at) VALUES
('d69eadcf-4340-45fc-b3d5-49030425b9fa', 'GreenTech 2025 - T2', 'eceb9620-9a30-4253-a365-271f219b6fef', '2025-06-05', '2029-01-15', '2025-10-12 19:18:22.071892', NULL, 7.00, NULL, '2028-06-05', 36, '2025-11-14 23:57:46.276179+00'),
('87fd3663-061b-4822-8a8b-b4df4d17e012', 'GreenTech 2025 - T1', 'eceb9620-9a30-4253-a365-271f219b6fef', '2025-02-05', '2028-01-01', '2025-10-12 19:18:21.802007', NULL, 7.00, NULL, '2028-02-05', 36, '2025-11-14 23:57:46.276179+00'),
('1530d32c-9046-4e6b-a107-9f5810c1fad9', 'EcoInvest 2025 - T1', '8e90e77f-16c5-4a9a-86ed-32fb4c3431f4', '2025-01-05', '2028-03-01', '2025-10-12 19:18:22.622211', NULL, 10.00, NULL, '2028-01-05', 36, '2025-11-17 22:10:18.325715+00');

-- Verify
SELECT COUNT(*) as total_tranches FROM tranches;
