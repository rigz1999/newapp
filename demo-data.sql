-- Demo data for Finixar dashboard screenshots
-- Organization ID: 926346b7-7ab3-4125-8ae7-3a1a98b5294e

-- Clear existing demo data for this org
DELETE FROM subscriptions WHERE projet_id IN (SELECT id FROM projets WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e');
DELETE FROM tranches WHERE projet_id IN (SELECT id FROM projets WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e');
DELETE FROM projets WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e';
DELETE FROM investors WHERE org_id = '926346b7-7ab3-4125-8ae7-3a1a98b5294e';

-- Insert realistic French investors
INSERT INTO investors (id, org_id, nom, prenom, email, telephone, date_naissance, adresse, ville, code_postal, pays, type_investisseur, statut, created_at) VALUES
('inv-001', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Martin', 'Sophie', 'sophie.martin@gmail.com', '+33 6 12 34 56 78', '1978-03-15', '12 Avenue des Champs-Élysées', 'Paris', '75008', 'France', 'Personne physique', 'Actif', NOW()),
('inv-002', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Dubois', 'François', 'f.dubois@outlook.fr', '+33 6 23 45 67 89', '1965-07-22', '45 Rue de la République', 'Lyon', '69002', 'France', 'Personne physique', 'Actif', NOW()),
('inv-003', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Bernard', 'Claire', 'claire.bernard@free.fr', '+33 6 34 56 78 90', '1982-11-08', '8 Boulevard Haussmann', 'Paris', '75009', 'France', 'Personne physique', 'Actif', NOW()),
('inv-004', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Petit', 'Jean-Luc', 'jl.petit@wanadoo.fr', '+33 6 45 67 89 01', '1970-05-30', '33 Cours Mirabeau', 'Aix-en-Provence', '13100', 'France', 'Personne physique', 'Actif', NOW()),
('inv-005', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Moreau', 'Isabelle', 'i.moreau@gmail.com', '+33 6 56 78 90 12', '1975-09-18', '22 Rue Royale', 'Lille', '59000', 'France', 'Personne physique', 'Actif', NOW()),
('inv-006', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Laurent', 'Philippe', 'philippe.laurent@orange.fr', '+33 6 67 89 01 23', '1968-12-05', '17 Place Bellecour', 'Lyon', '69002', 'France', 'Personne physique', 'Actif', NOW()),
('inv-007', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Roux', 'Marie-Christine', 'mc.roux@sfr.fr', '+33 6 78 90 12 34', '1980-04-27', '5 Avenue Montaigne', 'Paris', '75008', 'France', 'Personne physique', 'Actif', NOW()),
('inv-008', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Fournier', 'Alain', 'alain.fournier@numericable.fr', '+33 6 89 01 23 45', '1963-08-14', '28 Rue de Rivoli', 'Paris', '75004', 'France', 'Personne physique', 'Actif', NOW()),
('inv-009', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Girard', 'Nathalie', 'nathalie.girard@yahoo.fr', '+33 6 90 12 34 56', '1985-02-10', '14 Boulevard de la Croisette', 'Cannes', '06400', 'France', 'Personne physique', 'Actif', NOW()),
('inv-010', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Bonnet', 'Thierry', 't.bonnet@gmail.com', '+33 6 01 23 45 67', '1972-06-19', '40 Quai des Bateliers', 'Strasbourg', '67000', 'France', 'Personne physique', 'Actif', NOW()),
('inv-011', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Dupont', 'Valérie', 'valerie.dupont@laposte.net', '+33 6 12 45 78 90', '1977-10-03', '9 Place du Capitole', 'Toulouse', '31000', 'France', 'Personne physique', 'Actif', NOW()),
('inv-012', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Lambert', 'Patrick', 'p.lambert@club-internet.fr', '+33 6 23 56 89 01', '1966-01-28', '31 Rue Sainte-Catherine', 'Bordeaux', '33000', 'France', 'Personne physique', 'Actif', NOW()),
('inv-013', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Fontaine', 'Sylvie', 'sylvie.fontaine@neuf.fr', '+33 6 34 67 90 12', '1983-07-12', '18 Avenue Victor Hugo', 'Nice', '06000', 'France', 'Personne physique', 'Actif', NOW()),
('inv-014', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Rousseau', 'Marc', 'marc.rousseau@cegetel.net', '+33 6 45 78 01 23', '1969-11-25', '7 Place des Terreaux', 'Lyon', '69001', 'France', 'Personne physique', 'Actif', NOW()),
('inv-015', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Vincent', 'Catherine', 'catherine.vincent@bbox.fr', '+33 6 56 89 12 34', '1976-03-07', '25 Rue du Faubourg Saint-Honoré', 'Paris', '75008', 'France', 'Personne physique', 'Actif', NOW());

-- Project 1: Résidence Les Jardins de l'Opéra - €2,000,000 total
INSERT INTO projets (id, org_id, nom, description, montant_global_eur, date_debut, date_fin, statut, taux_rendement, created_at) VALUES
('proj-001', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Résidence Les Jardins de l''Opéra', 'Programme immobilier résidentiel haut de gamme situé au cœur du quartier de l''Opéra à Paris. 45 appartements avec services de conciergerie.', 2000000, '2024-01-15', '2026-12-31', 'En cours', 7.2, NOW());

INSERT INTO tranches (id, projet_id, numero_tranche, montant_eur, date_debut, date_fin, statut, created_at) VALUES
('tranche-001-A', 'proj-001', 'Tranche A', 1200000, '2024-01-15', '2024-06-30', 'Clôturée', NOW()),
('tranche-001-B', 'proj-001', 'Tranche B', 800000, '2024-07-01', '2024-12-31', 'En cours', NOW());

-- Tranche A subscriptions (total: €1,200,000)
INSERT INTO subscriptions (id, projet_id, tranche_id, investor_id, montant_eur, date_souscription, statut, created_at) VALUES
('sub-001-01', 'proj-001', 'tranche-001-A', 'inv-001', 350000, '2024-01-20', 'Validée', NOW()),
('sub-001-02', 'proj-001', 'tranche-001-A', 'inv-002', 400000, '2024-02-05', 'Validée', NOW()),
('sub-001-03', 'proj-001', 'tranche-001-A', 'inv-003', 250000, '2024-03-12', 'Validée', NOW()),
('sub-001-04', 'proj-001', 'tranche-001-A', 'inv-004', 200000, '2024-04-18', 'Validée', NOW());

-- Tranche B subscriptions (total: €800,000)
INSERT INTO subscriptions (id, projet_id, tranche_id, investor_id, montant_eur, date_souscription, statut, created_at) VALUES
('sub-001-05', 'proj-001', 'tranche-001-B', 'inv-005', 300000, '2024-07-10', 'Validée', NOW()),
('sub-001-06', 'proj-001', 'tranche-001-B', 'inv-006', 350000, '2024-08-22', 'Validée', NOW()),
('sub-001-07', 'proj-001', 'tranche-001-B', 'inv-007', 150000, '2024-09-15', 'Validée', NOW());

-- Project 2: Datacenter Paris Nord - €3,500,000 total
INSERT INTO projets (id, org_id, nom, description, montant_global_eur, date_debut, date_fin, statut, taux_rendement, created_at) VALUES
('proj-002', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Datacenter Paris Nord', 'Infrastructure de datacenter Tier 3 avec certification ISO 27001. Capacité de 500 racks dédiés aux entreprises du CAC 40.', 3500000, '2024-03-01', '2027-02-28', 'En cours', 8.5, NOW());

INSERT INTO tranches (id, projet_id, numero_tranche, montant_eur, date_debut, date_fin, statut, created_at) VALUES
('tranche-002-A', 'proj-002', 'Tranche A', 3500000, '2024-03-01', '2025-02-28', 'En cours', NOW());

-- Tranche A subscriptions (total: €3,500,000)
INSERT INTO subscriptions (id, projet_id, tranche_id, investor_id, montant_eur, date_souscription, statut, created_at) VALUES
('sub-002-01', 'proj-002', 'tranche-002-A', 'inv-008', 800000, '2024-03-15', 'Validée', NOW()),
('sub-002-02', 'proj-002', 'tranche-002-A', 'inv-009', 750000, '2024-04-08', 'Validée', NOW()),
('sub-002-03', 'proj-002', 'tranche-002-A', 'inv-010', 600000, '2024-05-20', 'Validée', NOW()),
('sub-002-04', 'proj-002', 'tranche-002-A', 'inv-011', 700000, '2024-06-12', 'Validée', NOW()),
('sub-002-05', 'proj-002', 'tranche-002-A', 'inv-012', 650000, '2024-07-25', 'Validée', NOW());

-- Project 3: Fonds Immobilier Régional Grand Est - €2,800,000 total
INSERT INTO projets (id, org_id, nom, description, montant_global_eur, date_debut, date_fin, statut, taux_rendement, created_at) VALUES
('proj-003', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Fonds Immobilier Régional Grand Est', 'Portefeuille diversifié d''actifs commerciaux et de bureaux dans la région Grand Est. Focus sur les villes de Strasbourg, Metz et Reims.', 2800000, '2023-09-01', '2026-08-31', 'En cours', 6.8, NOW());

INSERT INTO tranches (id, projet_id, numero_tranche, montant_eur, date_debut, date_fin, statut, created_at) VALUES
('tranche-003-A', 'proj-003', 'Tranche A', 2800000, '2023-09-01', '2024-08-31', 'Clôturée', NOW());

-- Tranche A subscriptions (total: €2,800,000)
INSERT INTO subscriptions (id, projet_id, tranche_id, investor_id, montant_eur, date_souscription, statut, created_at) VALUES
('sub-003-01', 'proj-003', 'tranche-003-A', 'inv-013', 500000, '2023-09-10', 'Validée', NOW()),
('sub-003-02', 'proj-003', 'tranche-003-A', 'inv-014', 450000, '2023-10-05', 'Validée', NOW()),
('sub-003-03', 'proj-003', 'tranche-003-A', 'inv-015', 550000, '2023-11-18', 'Validée', NOW()),
('sub-003-04', 'proj-003', 'tranche-003-A', 'inv-001', 400000, '2023-12-08', 'Validée', NOW()),
('sub-003-05', 'proj-003', 'tranche-003-A', 'inv-002', 500000, '2024-01-22', 'Validée', NOW()),
('sub-003-06', 'proj-003', 'tranche-003-A', 'inv-003', 400000, '2024-02-15', 'Validée', NOW());

-- Project 4: Programme Résidentiel Lyon Part-Dieu - €1,500,000 total
INSERT INTO projets (id, org_id, nom, description, montant_global_eur, date_debut, date_fin, statut, taux_rendement, created_at) VALUES
('proj-004', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'Programme Résidentiel Lyon Part-Dieu', 'Résidence neuve de 32 logements dans le quartier d''affaires de Part-Dieu. Proximité gare TGV et métro, idéal investissement locatif.', 1500000, '2024-05-01', '2026-04-30', 'En cours', 7.0, NOW());

INSERT INTO tranches (id, projet_id, numero_tranche, montant_eur, date_debut, date_fin, statut, created_at) VALUES
('tranche-004-A', 'proj-004', 'Tranche A', 1500000, '2024-05-01', '2025-04-30', 'En cours', NOW());

-- Tranche A subscriptions (total: €1,500,000)
INSERT INTO subscriptions (id, projet_id, tranche_id, investor_id, montant_eur, date_souscription, statut, created_at) VALUES
('sub-004-01', 'proj-004', 'tranche-004-A', 'inv-004', 400000, '2024-05-15', 'Validée', NOW()),
('sub-004-02', 'proj-004', 'tranche-004-A', 'inv-005', 350000, '2024-06-08', 'Validée', NOW()),
('sub-004-03', 'proj-004', 'tranche-004-A', 'inv-006', 450000, '2024-07-20', 'Validée', NOW()),
('sub-004-04', 'proj-004', 'tranche-004-A', 'inv-007', 300000, '2024-08-12', 'Validée', NOW());

-- Summary:
-- Project 1: €2,000,000 (€1,200,000 + €800,000)
-- Project 2: €3,500,000
-- Project 3: €2,800,000
-- Project 4: €1,500,000
-- TOTAL: €9,800,000 in projects with matching subscription amounts
