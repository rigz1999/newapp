-- ============================================
-- DATA MIGRATION: invitations
-- ============================================

INSERT INTO invitations (id, email, first_name, last_name, org_id, role, status, token, expires_at, accepted_at, created_at) VALUES
('ed0b44c2-cdd8-44ff-abb5-af7c61b9d78b', 'makhasalma@gmail.com', 'Salma', 'Makha', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'admin', 'accepted', '58f8cbac-bca7-4bab-8f5f-d849e4274fcb2a7a1d754c0c4b32bfb15eed27fa439b', '2025-11-17 19:03:20.461+00', '2025-11-10 19:15:21.876+00', '2025-11-10 19:03:20.628767+00'),
('b48bcf9f-7fbf-4325-90ba-6ae5ef65b36d', 'anouar.afqir@gmail.com', 'Anouar', 'Afqir', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'member', 'accepted', '0c6ea689-14b8-475b-bf0f-c42ac6c4c8d4890f9856cfdb4902a1dc4e41a5b0be54', '2025-11-18 00:01:47.013+00', '2025-11-11 00:03:38.647+00', '2025-11-11 00:01:47.416172+00'),
('3d93083d-53fb-4192-9246-b19047723734', 'ayman.zrig@gmail.com', 'dbgeyu', 'ebgiyz', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'member', 'accepted', '884c2b65-ff41-4af6-9a8f-3028365197cd4b42f3486ccd4e3d86c9fb1047d44392', '2025-11-18 00:16:26.301+00', '2025-11-11 00:17:10.583+00', '2025-11-11 00:16:26.367965+00'),
('55321d7f-81f2-477a-bf82-b4eaa3f32fd3', 'ayman.zrig@gmail.com', 'Ayman', 'Zrig', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'admin', 'accepted', '8f6cc893-157d-4fa2-8666-e235e1f7a527bd42f34d780146428c4bec4590199f32', '2025-11-30 16:42:44.503+00', '2025-11-23 16:43:03.717+00', '2025-11-23 16:42:44.578355+00'),
('0268761c-8f51-4dd1-8ca3-ad1ca9ceb5f7', 'anouar.afqir@gmail.com', 'Anouar', 'Afqir', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'member', 'accepted', 'f92bac23-5efa-40a6-9d1d-f7b70ae59f0ade75f08069654c2dbdc9e50fcfff5621', '2025-11-18 00:41:44.043+00', '2025-11-11 00:43:06.215+00', '2025-11-11 00:41:44.255064+00'),
('53919c62-6bce-4919-aba0-a5eddc7473e6', 'ayman.zrig@gmail.com', 'test', 'tedt', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'admin', 'accepted', '944a8225-fa52-489d-b38d-fe3a9c70b0421fbf7de1835349b2a06ef68719935369', '2025-11-18 21:54:35.772+00', '2025-11-11 21:56:10.271+00', '2025-11-11 21:54:35.838998+00'),
('a8e4c1ff-7507-4299-bac2-654cecd0c3ca', 'ayman.zrig@gmail.com', 'ayman', 'zrig', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'admin', 'accepted', 'cc35a096-f7b0-4aea-94f4-530b76928a114e12a457fd5c42a6a6b67277cccfd18b', '2025-11-29 00:21:37.239+00', '2025-11-22 00:34:17.26+00', '2025-11-22 00:21:37.362477+00'),
('e603a2cc-a52c-4060-952e-d1342a1742f4', 'ayman.zrig@gmail.com', 'Ayman', 'Zrig', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'admin', 'accepted', '59da77c6-3b3d-425f-abde-bbb2d8ed7fcede5db0f89cd14951a1be969975c9b09c', '2025-11-29 16:00:35.96+00', '2025-11-22 16:00:58.763+00', '2025-11-22 16:00:36.02299+00'),
('05e89eec-5a2c-4d9c-8120-782aef8db7a0', 'aymanzrig99@gmail.com', 'Aymann', 'Zrigg', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'member', 'accepted', '1e58f283-a26a-49f4-bc4c-8ad8fc79625553da06963e834ed09ddd6985d6b903ee', '2025-12-19 09:42:38.81+00', '2025-12-12 09:43:02.779+00', '2025-12-12 09:42:38.869978+00'),
('2a678c7b-4957-4a0f-b506-a1207752345d', 'maxime.roger91@gmail.com', 'Maxime', 'Roger', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'member', 'accepted', '9f55efaa-6373-4168-aed3-5f82d617d43e95679febe6d64c748a6537087a2b99c2', '2025-12-19 10:38:16.003+00', '2025-12-12 10:39:28.198+00', '2025-12-12 10:38:16.064913+00'),
('a2915e5c-414f-4ee9-b971-260a28690264', 'yiwem56277@naqulu.com', 'gegrgr', 'rgegregr', '926346b7-7ab3-4125-8ae7-3a1a98b5294e', 'member', 'pending', 'a71b405f-8937-4ca6-adfa-af0ef309bf0eef352fcf419e4bffa27be769644c4c7a', '2025-12-20 13:24:57.368+00', NULL, '2025-12-13 13:24:57.455761+00');

-- Verify
SELECT COUNT(*) as total_invitations FROM invitations;
