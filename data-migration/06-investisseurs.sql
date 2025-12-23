-- ============================================
-- DATA MIGRATION: investisseurs
-- ============================================

INSERT INTO investisseurs (id, id_investisseur, type, nom_raison_sociale, representant_legal, siren, email, telephone, adresse, residence_fiscale, departement_naissance, created_at, date_naissance, lieu_naissance, ppe, categorie_mifid, rib_file_path, rib_uploaded_at, rib_status, cgp, email_cgp, org_id, cgp_nom, cgp_email) VALUES
('1a21ad83-971c-4568-b3f1-1230ad5132d6', 'inv00001', 'morale', 'TechInvest SA', 'Jean Martin', 111222333, 'contact@techinvest.fr', 612345678, '15 rue de Paris 75001', 'France', NULL, '2025-10-12 19:18:22.754804', NULL, NULL, NULL, NULL, NULL, NULL, 'manquant', 'CGP Finance', 'cgp@finance.fr', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', NULL, NULL),
('ddf63493-5dca-454d-9162-4be3bede7f43', 'inv00002', 'physique', 'Marie Lefevre', 'Marie Lefevre', 444555666, 'm.lefevre@email.fr', 698765432, '8 avenue Victor Hugo 69001', 'France', 69, '2025-10-12 19:18:22.882859', NULL, NULL, NULL, NULL, NULL, NULL, 'manquant', 'FinancePartner', 'info@financepartner.fr', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', NULL, NULL),
('87e31903-934a-4d3b-b681-fc5506b64e31', 'inv00003', 'morale', 'Capital Partners SARL', 'Sophie Dubois', 777888999, 's.dubois@capitalpartners.fr', 645123789, '25 boulevard Haussmann 75009', 'France', NULL, '2025-10-12 19:18:23.020797', NULL, NULL, NULL, NULL, NULL, NULL, 'manquant', 'CGP Finance', 'cgp@finance.fr', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', NULL, NULL);

-- Verify
SELECT COUNT(*) as total_investisseurs FROM investisseurs;
