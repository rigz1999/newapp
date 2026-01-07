-- Demo data for Finixar dashboard screenshots
-- Organization ID: 926346b7-7ab3-4125-8ae7-3a1a98b5294e
-- Updated with complete info and recent data for January 2026

-- Clear existing demo data for this org
DELETE FROM coupons_echeances WHERE souscription_id IN (SELECT id FROM souscriptions WHERE projet_id IN (SELECT id FROM projets WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e'));
DELETE FROM souscriptions WHERE projet_id IN (SELECT id FROM projets WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e');
DELETE FROM tranches WHERE projet_id IN (SELECT id FROM projets WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e');
DELETE FROM projets WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e';
DELETE FROM investisseurs WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e';

-- Insert realistic French investors
INSERT INTO investisseurs (id, org_id, id_investisseur, type, nom_raison_sociale, email, telephone, adresse, residence_fiscale, date_naissance, created_at) VALUES
('a0000000-0000-0000-0000-000000000001', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-001', 'Personne physique', 'Sophie Martin', 'sophie.martin@gmail.com', 612345678, '12 Avenue des Champs-Élysées, Paris', 'France', '1978-03-15', NOW()),
('a0000000-0000-0000-0000-000000000002', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-002', 'Personne physique', 'François Dubois', 'f.dubois@outlook.fr', 623456789, '45 Rue de la République, Lyon', 'France', '1965-07-22', NOW()),
('a0000000-0000-0000-0000-000000000003', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-003', 'Personne physique', 'Claire Bernard', 'claire.bernard@free.fr', 634567890, '8 Boulevard Haussmann, Paris', 'France', '1982-11-08', NOW()),
('a0000000-0000-0000-0000-000000000004', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-004', 'Personne physique', 'Jean-Luc Petit', 'jl.petit@wanadoo.fr', 645678901, '33 Cours Mirabeau, Aix-en-Provence', 'France', '1970-05-30', NOW()),
('a0000000-0000-0000-0000-000000000005', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-005', 'Personne physique', 'Isabelle Moreau', 'i.moreau@gmail.com', 656789012, '22 Rue Royale, Lille', 'France', '1975-09-18', NOW()),
('a0000000-0000-0000-0000-000000000006', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-006', 'Personne physique', 'Philippe Laurent', 'philippe.laurent@orange.fr', 667890123, '17 Place Bellecour, Lyon', 'France', '1968-12-05', NOW()),
('a0000000-0000-0000-0000-000000000007', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-007', 'Personne physique', 'Marie-Christine Roux', 'mc.roux@sfr.fr', 678901234, '5 Avenue Montaigne, Paris', 'France', '1980-04-27', NOW()),
('a0000000-0000-0000-0000-000000000008', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-008', 'Personne physique', 'Alain Fournier', 'alain.fournier@numericable.fr', 689012345, '28 Rue de Rivoli, Paris', 'France', '1963-08-14', NOW()),
('a0000000-0000-0000-0000-000000000009', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-009', 'Personne physique', 'Nathalie Girard', 'nathalie.girard@yahoo.fr', 690123456, '14 Boulevard de la Croisette, Cannes', 'France', '1985-02-10', NOW()),
('a0000000-0000-0000-0000-00000000000a', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-010', 'Personne physique', 'Thierry Bonnet', 't.bonnet@gmail.com', 601234567, '40 Quai des Bateliers, Strasbourg', 'France', '1972-06-19', NOW()),
('a0000000-0000-0000-0000-00000000000b', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-011', 'Personne physique', 'Valérie Dupont', 'valerie.dupont@laposte.net', 612457890, '9 Place du Capitole, Toulouse', 'France', '1977-10-03', NOW()),
('a0000000-0000-0000-0000-00000000000c', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-012', 'Personne physique', 'Patrick Lambert', 'p.lambert@club-internet.fr', 623568901, '31 Rue Sainte-Catherine, Bordeaux', 'France', '1966-01-28', NOW()),
('a0000000-0000-0000-0000-00000000000d', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-013', 'Personne physique', 'Sylvie Fontaine', 'sylvie.fontaine@neuf.fr', 634679012, '18 Avenue Victor Hugo, Nice', 'France', '1983-07-12', NOW()),
('a0000000-0000-0000-0000-00000000000e', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-014', 'Personne physique', 'Marc Rousseau', 'marc.rousseau@cegetel.net', 645780123, '7 Place des Terreaux, Lyon', 'France', '1969-11-25', NOW()),
('a0000000-0000-0000-0000-00000000000f', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-015', 'Personne physique', 'Catherine Vincent', 'catherine.vincent@bbox.fr', 656891234, '25 Rue du Faubourg Saint-Honoré, Paris', 'France', '1976-03-07', NOW());

-- Project 1: Résidence Les Jardins de l'Opéra - €2,000,000 total
INSERT INTO projets (id, org_id, projet, emetteur, siren_emetteur, nom_representant, prenom_representant, email_representant, montant_global_eur, taux_interet, date_emission, duree_mois, taux_nominal, periodicite_coupons, type, base_interet, created_at) VALUES
('b0000000-0000-0000-0000-000000000001', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Résidence Les Jardins de l''Opéra', 'SCI Jardins Opéra', 892456789, 'Moreau', 'Jean-Pierre', 'jp.moreau@jardins-opera.fr', 2000000, 7.2, '2024-01-15', 36, 7.2, 'Semestrielle', 'obligations_simples', 360, NOW());

INSERT INTO tranches (id, projet_id, tranche_name, date_emission, date_echeance, date_transfert_fonds, taux_nominal, periodicite_coupons, duree_mois, created_at) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Tranche A', '2024-01-15', '2025-07-15', '2024-02-01', 7.2, 'Semestrielle', 18, NOW()),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Tranche B', '2024-07-01', '2026-12-31', '2024-07-15', 7.2, 'Semestrielle', 18, NOW());

-- Tranche A subscriptions (total: €1,200,000)
INSERT INTO souscriptions (id, id_souscription, projet_id, tranche_id, investisseur_id, montant_investi, nombre_obligations, date_souscription, date_transfert, created_at) VALUES
('d0000000-0000-0000-0000-000000000001', 'SOUS-001-01', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 350000, 350, '2024-01-20', '2024-02-05', NOW()),
('d0000000-0000-0000-0000-000000000002', 'SOUS-001-02', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 400000, 400, '2024-02-05', '2024-02-15', NOW()),
('d0000000-0000-0000-0000-000000000003', 'SOUS-001-03', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 250000, 250, '2024-03-12', '2024-03-25', NOW()),
('d0000000-0000-0000-0000-000000000004', 'SOUS-001-04', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 200000, 200, '2024-04-18', '2024-04-30', NOW());

-- Tranche B subscriptions (total: €800,000)
INSERT INTO souscriptions (id, id_souscription, projet_id, tranche_id, investisseur_id, montant_investi, nombre_obligations, date_souscription, date_transfert, created_at) VALUES
('d0000000-0000-0000-0000-000000000005', 'SOUS-001-05', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 300000, 300, '2024-07-10', '2024-07-20', NOW()),
('d0000000-0000-0000-0000-000000000006', 'SOUS-001-06', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000006', 350000, 350, '2024-08-22', '2024-09-05', NOW()),
('d0000000-0000-0000-0000-000000000007', 'SOUS-001-07', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 150000, 150, '2024-09-15', '2024-09-28', NOW());

-- Project 2: Datacenter Paris Nord - €3,500,000 total (with recent January 2026 subscriptions)
INSERT INTO projets (id, org_id, projet, emetteur, siren_emetteur, nom_representant, prenom_representant, email_representant, montant_global_eur, taux_interet, date_emission, duree_mois, taux_nominal, periodicite_coupons, type, base_interet, created_at) VALUES
('b0000000-0000-0000-0000-000000000002', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Datacenter Paris Nord', 'DataCenter Île-de-France SAS', 823567123, 'Leroy', 'Michel', 'michel.leroy@datacenter-idf.fr', 3500000, 8.5, '2025-09-01', 36, 8.5, 'Trimestrielle', 'obligations_simples', 360, NOW());

INSERT INTO tranches (id, projet_id, tranche_name, date_emission, date_echeance, date_transfert_fonds, taux_nominal, periodicite_coupons, duree_mois, created_at) VALUES
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Tranche A', '2025-09-01', '2028-08-31', '2025-09-15', 8.5, 'Trimestrielle', 36, NOW());

-- Tranche A subscriptions (total: €3,500,000) - with RECENT January 2026 dates
INSERT INTO souscriptions (id, id_souscription, projet_id, tranche_id, investisseur_id, montant_investi, nombre_obligations, date_souscription, date_transfert, created_at) VALUES
('d0000000-0000-0000-0000-000000000008', 'SOUS-002-01', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000008', 800000, 800, '2025-09-15', '2025-09-30', NOW()),
('d0000000-0000-0000-0000-000000000009', 'SOUS-002-02', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000009', 750000, 750, '2025-10-08', '2025-10-20', NOW()),
('d0000000-0000-0000-0000-00000000000a', 'SOUS-002-03', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 600000, 600, '2025-11-20', '2025-12-05', NOW()),
('d0000000-0000-0000-0000-00000000000b', 'SOUS-002-04', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000b', 700000, 700, '2025-12-12', '2025-12-28', NOW()),
('d0000000-0000-0000-0000-00000000000c', 'SOUS-002-05', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000c', 650000, 650, '2026-01-05', '2026-01-15', NOW());

-- Project 3: Fonds Immobilier Régional Grand Est - €2,800,000 total
INSERT INTO projets (id, org_id, projet, emetteur, siren_emetteur, nom_representant, prenom_representant, email_representant, montant_global_eur, taux_interet, date_emission, duree_mois, taux_nominal, periodicite_coupons, type, base_interet, created_at) VALUES
('b0000000-0000-0000-0000-000000000003', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Fonds Immobilier Régional Grand Est', 'Grand Est Patrimoine SA', 456789234, 'Schmitt', 'Pauline', 'p.schmitt@grandest-patrimoine.fr', 2800000, 6.8, '2023-09-01', 36, 6.8, 'Annuelle', 'obligations_simples', 360, NOW());

INSERT INTO tranches (id, projet_id, tranche_name, date_emission, date_echeance, date_transfert_fonds, taux_nominal, periodicite_coupons, duree_mois, created_at) VALUES
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 'Tranche A', '2023-09-01', '2026-08-31', '2023-09-15', 6.8, 'Annuelle', 36, NOW());

-- Tranche A subscriptions (total: €2,800,000)
INSERT INTO souscriptions (id, id_souscription, projet_id, tranche_id, investisseur_id, montant_investi, nombre_obligations, date_souscription, date_transfert, created_at) VALUES
('d0000000-0000-0000-0000-00000000000d', 'SOUS-003-01', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-00000000000d', 500000, 500, '2023-09-10', '2023-09-25', NOW()),
('d0000000-0000-0000-0000-00000000000e', 'SOUS-003-02', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-00000000000e', 450000, 450, '2023-10-05', '2023-10-20', NOW()),
('d0000000-0000-0000-0000-00000000000f', 'SOUS-003-03', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-00000000000f', 550000, 550, '2023-11-18', '2023-12-05', NOW()),
('d0000000-0000-0000-0000-000000000010', 'SOUS-003-04', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 400000, 400, '2023-12-08', '2023-12-22', NOW()),
('d0000000-0000-0000-0000-000000000011', 'SOUS-003-05', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 500000, 500, '2024-01-22', '2024-02-08', NOW()),
('d0000000-0000-0000-0000-000000000012', 'SOUS-003-06', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 400000, 400, '2024-02-15', '2024-03-01', NOW());

-- Project 4: Programme Résidentiel Lyon Part-Dieu - €1,500,000 total (with recent January 2026 subscriptions)
INSERT INTO projets (id, org_id, projet, emetteur, siren_emetteur, nom_representant, prenom_representant, email_representant, montant_global_eur, taux_interet, date_emission, duree_mois, taux_nominal, periodicite_coupons, type, base_interet, created_at) VALUES
('b0000000-0000-0000-0000-000000000004', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Programme Résidentiel Lyon Part-Dieu', 'Lyon Habitat Investissement', 789234567, 'Bertrand', 'Stéphanie', 's.bertrand@lyon-habitat.fr', 1500000, 7.0, '2025-11-01', 24, 7.0, 'Semestrielle', 'obligations_simples', 360, NOW());

INSERT INTO tranches (id, projet_id, tranche_name, date_emission, date_echeance, date_transfert_fonds, taux_nominal, periodicite_coupons, duree_mois, created_at) VALUES
('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', 'Tranche A', '2025-11-01', '2027-10-31', '2025-11-15', 7.0, 'Semestrielle', 24, NOW());

-- Tranche A subscriptions (total: €1,500,000) - with RECENT January 2026 dates
INSERT INTO souscriptions (id, id_souscription, projet_id, tranche_id, investisseur_id, montant_investi, nombre_obligations, date_souscription, date_transfert, created_at) VALUES
('d0000000-0000-0000-0000-000000000013', 'SOUS-004-01', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 400000, 400, '2025-11-15', '2025-11-30', NOW()),
('d0000000-0000-0000-0000-000000000014', 'SOUS-004-02', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 350000, 350, '2025-12-08', '2025-12-20', NOW()),
('d0000000-0000-0000-0000-000000000015', 'SOUS-004-03', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', 450000, 450, '2026-01-03', '2026-01-10', NOW()),
('d0000000-0000-0000-0000-000000000016', 'SOUS-004-04', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000007', 300000, 300, '2026-01-06', '2026-01-12', NOW());

-- Summary:
-- Project 1: €2,000,000 (€1,200,000 + €800,000) - Complete info with representative
-- Project 2: €3,500,000 - Complete info, RECENT Jan 2026 subscription
-- Project 3: €2,800,000 - Complete info
-- Project 4: €1,500,000 - Complete info, RECENT Jan 2026 subscriptions
-- TOTAL: €9,800,000 in projects with matching subscription amounts
-- 15 realistic French investors
-- 22 subscriptions across 4 projects
-- Recent activity in January 2026 for dashboard KPIs
-- Coupons will be auto-generated by the system when you change periodicite
