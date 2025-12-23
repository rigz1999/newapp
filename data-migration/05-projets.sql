-- ============================================
-- DATA MIGRATION: projets
-- ============================================

INSERT INTO projets (id, projet, emetteur, siren_emetteur, nom_representant, prenom_representant, email_representant, representant_masse, email_rep_masse, telephone_rep_masse, created_at, taux_interet, montant_global_eur, maturite_mois, base_interet, type, taux_nominal, periodicite_coupons, date_emission, duree_mois, org_id) VALUES
('8e90e77f-16c5-4a9a-86ed-32fb4c3431f4', 'EcoInvest 2025', 'EcoInvest SA', 456789123, 'Moreau', 'Thomas', 't.moreau@ecoinvest.fr', 'Laurent Petit', 'l.petit@masse.fr', 645678901, '2025-10-12 19:18:21.525632', 8.50, 3000000.00, 36, 360, 'obligations_simples', 10.00, 'annuelle', '2025-02-05', 24, '926346b7-7ab3-4125-8ae7-3a1a98b5294e'),
('eceb9620-9a30-4253-a365-271f219b6fef', 'GreenTech 2025', 'GreenTech SAS', 123456789, 'Dupont', 'Jean', 'j.dupont@greentech.fr', 'Pierre Martin', 'p.martin@masse.fr', 612345678, '2025-10-12 19:18:21.151743', 10.00, 1500000.00, 36, 360, 'obligations_simples', 9.99, 'annuelle', '2025-02-05', 24, '926346b7-7ab3-4125-8ae7-3a1a98b5294e');

-- Verify
SELECT COUNT(*) as total_projets FROM projets;
