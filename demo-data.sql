-- Demo data for Finixar dashboard screenshots
-- Organization ID: 926346b7-7ab3-4125-8ae7-3a1a98b5294e

-- Clear existing demo data for this org
DELETE FROM souscriptions WHERE projet_id IN (SELECT id FROM projets WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e');
DELETE FROM tranches WHERE projet_id IN (SELECT id FROM projets WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e');
DELETE FROM projets WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e';
DELETE FROM investisseurs WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e';

-- Insert realistic French investors
INSERT INTO investisseurs (id, org_id, id_investisseur, type, nom_raison_sociale, email, telephone, adresse, residence_fiscale, date_naissance, created_at) VALUES
('inv-001', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-001', 'Personne physique', 'Sophie Martin', 'sophie.martin@gmail.com', 612345678, '12 Avenue des Champs-Élysées, Paris', 'France', '1978-03-15', NOW()),
('inv-002', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-002', 'Personne physique', 'François Dubois', 'f.dubois@outlook.fr', 623456789, '45 Rue de la République, Lyon', 'France', '1965-07-22', NOW()),
('inv-003', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-003', 'Personne physique', 'Claire Bernard', 'claire.bernard@free.fr', 634567890, '8 Boulevard Haussmann, Paris', 'France', '1982-11-08', NOW()),
('inv-004', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-004', 'Personne physique', 'Jean-Luc Petit', 'jl.petit@wanadoo.fr', 645678901, '33 Cours Mirabeau, Aix-en-Provence', 'France', '1970-05-30', NOW()),
('inv-005', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-005', 'Personne physique', 'Isabelle Moreau', 'i.moreau@gmail.com', 656789012, '22 Rue Royale, Lille', 'France', '1975-09-18', NOW()),
('inv-006', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-006', 'Personne physique', 'Philippe Laurent', 'philippe.laurent@orange.fr', 667890123, '17 Place Bellecour, Lyon', 'France', '1968-12-05', NOW()),
('inv-007', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-007', 'Personne physique', 'Marie-Christine Roux', 'mc.roux@sfr.fr', 678901234, '5 Avenue Montaigne, Paris', 'France', '1980-04-27', NOW()),
('inv-008', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-008', 'Personne physique', 'Alain Fournier', 'alain.fournier@numericable.fr', 689012345, '28 Rue de Rivoli, Paris', 'France', '1963-08-14', NOW()),
('inv-009', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-009', 'Personne physique', 'Nathalie Girard', 'nathalie.girard@yahoo.fr', 690123456, '14 Boulevard de la Croisette, Cannes', 'France', '1985-02-10', NOW()),
('inv-010', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-010', 'Personne physique', 'Thierry Bonnet', 't.bonnet@gmail.com', 601234567, '40 Quai des Bateliers, Strasbourg', 'France', '1972-06-19', NOW()),
('inv-011', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-011', 'Personne physique', 'Valérie Dupont', 'valerie.dupont@laposte.net', 612457890, '9 Place du Capitole, Toulouse', 'France', '1977-10-03', NOW()),
('inv-012', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-012', 'Personne physique', 'Patrick Lambert', 'p.lambert@club-internet.fr', 623568901, '31 Rue Sainte-Catherine, Bordeaux', 'France', '1966-01-28', NOW()),
('inv-013', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-013', 'Personne physique', 'Sylvie Fontaine', 'sylvie.fontaine@neuf.fr', 634679012, '18 Avenue Victor Hugo, Nice', 'France', '1983-07-12', NOW()),
('inv-014', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-014', 'Personne physique', 'Marc Rousseau', 'marc.rousseau@cegetel.net', 645780123, '7 Place des Terreaux, Lyon', 'France', '1969-11-25', NOW()),
('inv-015', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'INV-2024-015', 'Personne physique', 'Catherine Vincent', 'catherine.vincent@bbox.fr', 656891234, '25 Rue du Faubourg Saint-Honoré, Paris', 'France', '1976-03-07', NOW());

-- Project 1: Résidence Les Jardins de l'Opéra - €2,000,000 total
INSERT INTO projets (id, org_id, projet, emetteur, montant_global_eur, taux_interet, date_emission, duree_mois, taux_nominal, periodicite_coupons, type, base_interet, created_at) VALUES
('proj-001', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Résidence Les Jardins de l''Opéra', 'SCI Jardins Opéra', 2000000, 7.2, '2024-01-15', 36, 7.2, 'Semestrielle', 'obligations_simples', 360, NOW());

INSERT INTO tranches (id, projet_id, tranche_name, date_emission, date_echeance, taux_nominal, periodicite_coupons, duree_mois, created_at) VALUES
('tranche-001-A', 'proj-001', 'Tranche A', '2024-01-15', '2024-06-30', 7.2, 'Semestrielle', 18, NOW()),
('tranche-001-B', 'proj-001', 'Tranche B', '2024-07-01', '2026-12-31', 7.2, 'Semestrielle', 18, NOW());

-- Tranche A subscriptions (total: €1,200,000)
INSERT INTO souscriptions (id, id_souscription, projet_id, tranche_id, investisseur_id, montant_investi, nombre_obligations, date_souscription, created_at) VALUES
('sub-001-01', 'SOUS-001-01', 'proj-001', 'tranche-001-A', 'inv-001', 350000, 350, '2024-01-20', NOW()),
('sub-001-02', 'SOUS-001-02', 'proj-001', 'tranche-001-A', 'inv-002', 400000, 400, '2024-02-05', NOW()),
('sub-001-03', 'SOUS-001-03', 'proj-001', 'tranche-001-A', 'inv-003', 250000, 250, '2024-03-12', NOW()),
('sub-001-04', 'SOUS-001-04', 'proj-001', 'tranche-001-A', 'inv-004', 200000, 200, '2024-04-18', NOW());

-- Tranche B subscriptions (total: €800,000)
INSERT INTO souscriptions (id, id_souscription, projet_id, tranche_id, investisseur_id, montant_investi, nombre_obligations, date_souscription, created_at) VALUES
('sub-001-05', 'SOUS-001-05', 'proj-001', 'tranche-001-B', 'inv-005', 300000, 300, '2024-07-10', NOW()),
('sub-001-06', 'SOUS-001-06', 'proj-001', 'tranche-001-B', 'inv-006', 350000, 350, '2024-08-22', NOW()),
('sub-001-07', 'SOUS-001-07', 'proj-001', 'tranche-001-B', 'inv-007', 150000, 150, '2024-09-15', NOW());

-- Project 2: Datacenter Paris Nord - €3,500,000 total
INSERT INTO projets (id, org_id, projet, emetteur, montant_global_eur, taux_interet, date_emission, duree_mois, taux_nominal, periodicite_coupons, type, base_interet, created_at) VALUES
('proj-002', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Datacenter Paris Nord', 'DataCenter Île-de-France SAS', 3500000, 8.5, '2024-03-01', 36, 8.5, 'Trimestrielle', 'obligations_simples', 360, NOW());

INSERT INTO tranches (id, projet_id, tranche_name, date_emission, date_echeance, taux_nominal, periodicite_coupons, duree_mois, created_at) VALUES
('tranche-002-A', 'proj-002', 'Tranche A', '2024-03-01', '2027-02-28', 8.5, 'Trimestrielle', 36, NOW());

-- Tranche A subscriptions (total: €3,500,000)
INSERT INTO souscriptions (id, id_souscription, projet_id, tranche_id, investisseur_id, montant_investi, nombre_obligations, date_souscription, created_at) VALUES
('sub-002-01', 'SOUS-002-01', 'proj-002', 'tranche-002-A', 'inv-008', 800000, 800, '2024-03-15', NOW()),
('sub-002-02', 'SOUS-002-02', 'proj-002', 'tranche-002-A', 'inv-009', 750000, 750, '2024-04-08', NOW()),
('sub-002-03', 'SOUS-002-03', 'proj-002', 'tranche-002-A', 'inv-010', 600000, 600, '2024-05-20', NOW()),
('sub-002-04', 'SOUS-002-04', 'proj-002', 'tranche-002-A', 'inv-011', 700000, 700, '2024-06-12', NOW()),
('sub-002-05', 'SOUS-002-05', 'proj-002', 'tranche-002-A', 'inv-012', 650000, 650, '2024-07-25', NOW());

-- Project 3: Fonds Immobilier Régional Grand Est - €2,800,000 total
INSERT INTO projets (id, org_id, projet, emetteur, montant_global_eur, taux_interet, date_emission, duree_mois, taux_nominal, periodicite_coupons, type, base_interet, created_at) VALUES
('proj-003', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Fonds Immobilier Régional Grand Est', 'Grand Est Patrimoine SA', 2800000, 6.8, '2023-09-01', 36, 6.8, 'Annuelle', 'obligations_simples', 360, NOW());

INSERT INTO tranches (id, projet_id, tranche_name, date_emission, date_echeance, taux_nominal, periodicite_coupons, duree_mois, created_at) VALUES
('tranche-003-A', 'proj-003', 'Tranche A', '2023-09-01', '2026-08-31', 6.8, 'Annuelle', 36, NOW());

-- Tranche A subscriptions (total: €2,800,000)
INSERT INTO souscriptions (id, id_souscription, projet_id, tranche_id, investisseur_id, montant_investi, nombre_obligations, date_souscription, created_at) VALUES
('sub-003-01', 'SOUS-003-01', 'proj-003', 'tranche-003-A', 'inv-013', 500000, 500, '2023-09-10', NOW()),
('sub-003-02', 'SOUS-003-02', 'proj-003', 'tranche-003-A', 'inv-014', 450000, 450, '2023-10-05', NOW()),
('sub-003-03', 'SOUS-003-03', 'proj-003', 'tranche-003-A', 'inv-015', 550000, 550, '2023-11-18', NOW()),
('sub-003-04', 'SOUS-003-04', 'proj-003', 'tranche-003-A', 'inv-001', 400000, 400, '2023-12-08', NOW()),
('sub-003-05', 'SOUS-003-05', 'proj-003', 'tranche-003-A', 'inv-002', 500000, 500, '2024-01-22', NOW()),
('sub-003-06', 'SOUS-003-06', 'proj-003', 'tranche-003-A', 'inv-003', 400000, 400, '2024-02-15', NOW());

-- Project 4: Programme Résidentiel Lyon Part-Dieu - €1,500,000 total
INSERT INTO projets (id, org_id, projet, emetteur, montant_global_eur, taux_interet, date_emission, duree_mois, taux_nominal, periodicite_coupons, type, base_interet, created_at) VALUES
('proj-004', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Programme Résidentiel Lyon Part-Dieu', 'Lyon Habitat Investissement', 1500000, 7.0, '2024-05-01', 24, 7.0, 'Semestrielle', 'obligations_simples', 360, NOW());

INSERT INTO tranches (id, projet_id, tranche_name, date_emission, date_echeance, taux_nominal, periodicite_coupons, duree_mois, created_at) VALUES
('tranche-004-A', 'proj-004', 'Tranche A', '2024-05-01', '2026-04-30', 7.0, 'Semestrielle', 24, NOW());

-- Tranche A subscriptions (total: €1,500,000)
INSERT INTO souscriptions (id, id_souscription, projet_id, tranche_id, investisseur_id, montant_investi, nombre_obligations, date_souscription, created_at) VALUES
('sub-004-01', 'SOUS-004-01', 'proj-004', 'tranche-004-A', 'inv-004', 400000, 400, '2024-05-15', NOW()),
('sub-004-02', 'SOUS-004-02', 'proj-004', 'tranche-004-A', 'inv-005', 350000, 350, '2024-06-08', NOW()),
('sub-004-03', 'SOUS-004-03', 'proj-004', 'tranche-004-A', 'inv-006', 450000, 450, '2024-07-20', NOW()),
('sub-004-04', 'SOUS-004-04', 'proj-004', 'tranche-004-A', 'inv-007', 300000, 300, '2024-08-12', NOW());

-- Summary:
-- Project 1: €2,000,000 (€1,200,000 + €800,000)
-- Project 2: €3,500,000
-- Project 3: €2,800,000
-- Project 4: €1,500,000
-- TOTAL: €9,800,000 in projects with matching subscription amounts
