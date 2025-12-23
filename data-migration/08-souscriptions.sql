-- ============================================
-- DATA MIGRATION: souscriptions
-- ============================================

INSERT INTO souscriptions (id, id_souscription, projet_id, tranche_id, investisseur_id, date_souscription, nombre_obligations, montant_investi, coupon_brut, coupon_net, prochaine_date_coupon, created_at, cgp, email_cgp, date_validation_bs, date_transfert, pea, pea_compte, code_cgp, siren_cgp) VALUES
('49d391c3-f9ea-4b82-8622-71878a67a1a3', 'sub0000001', 'eceb9620-9a30-4253-a365-271f219b6fef', '87fd3663-061b-4822-8a8b-b4df4d17e012', '1a21ad83-971c-4568-b3f1-1230ad5132d6', '2025-01-15', 100, 50000.00, 1750.00, 1750.00, '2025-07-01', '2025-10-12 19:18:23.99786', 'CGP Finance', 'cgp@finance.fr', NULL, NULL, NULL, NULL, NULL, NULL),
('7fb3abdb-bbe3-487a-8161-2bd190db835f', 'sub0000003', 'eceb9620-9a30-4253-a365-271f219b6fef', 'd69eadcf-4340-45fc-b3d5-49030425b9fa', '87e31903-934a-4d3b-b681-fc5506b64e31', '2025-01-25', 200, 100000.00, 3500.00, 3500.00, '2026-01-15', '2025-10-12 19:18:25.354885', 'CGP Finance', 'cgp@finance.fr', NULL, NULL, NULL, NULL, NULL, NULL),
('8e8091df-e2f5-42f4-8f48-b861797dc624', 'sub0000002', 'eceb9620-9a30-4253-a365-271f219b6fef', '87fd3663-061b-4822-8a8b-b4df4d17e012', 'ddf63493-5dca-454d-9162-4be3bede7f43', '2024-01-20', 50, 25000.00, 875.00, 612.50, '2025-07-01', '2025-10-12 19:18:24.7242', 'FinancePartner', 'info@financepartner.fr', NULL, NULL, NULL, NULL, NULL, NULL),
('d7dbfa71-d7b7-4387-a1af-b355834f9063', 'URGENT-DEMO', NULL, '87fd3663-061b-4822-8a8b-b4df4d17e012', '1a21ad83-971c-4568-b3f1-1230ad5132d6', '2024-01-15', NULL, 15000.00, 525.00, 525.00, '2025-10-15', '2025-10-12 22:17:54.090771', 'CGP Finance', 'cgp@finance.fr', NULL, NULL, NULL, NULL, NULL, NULL),
('17fa91b7-66b8-485d-a0a1-81c197b12910', 'sub0000006', '8e90e77f-16c5-4a9a-86ed-32fb4c3431f4', '1530d32c-9046-4e6b-a107-9f5810c1fad9', 'ddf63493-5dca-454d-9162-4be3bede7f43', '2025-03-01', 40, 20000.00, 2000.00, 1400.00, '2025-09-01', '2025-10-12 19:18:27.220711', 'FinancePartner', 'info@financepartner.fr', NULL, NULL, NULL, NULL, NULL, NULL);

-- Verify
SELECT COUNT(*) as total_souscriptions FROM souscriptions;
