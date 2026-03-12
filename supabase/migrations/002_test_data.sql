-- ============================================================
-- DONNÉES DE TEST - PHARMAGROSS TCHAD
-- ============================================================

-- ============================================================
-- 1. MÉDICAMENTS (20 produits courants au Tchad)
-- ============================================================
INSERT INTO public.medicaments (nom, code, description, forme, dosage, marge, seuil_alerte, actif) VALUES
('Paracétamol', 'PARA500', 'Antalgique et antipyrétique', 'Comprimé', '500mg', 200, 20, true),
('Amoxicilline', 'AMOX500', 'Antibiotique large spectre', 'Gélule', '500mg', 350, 15, true),
('Ibuprofène', 'IBU400', 'Anti-inflammatoire non stéroïdien', 'Comprimé', '400mg', 250, 15, true),
('Métronidazole', 'METRO250', 'Antibiotique anti-infectieux', 'Comprimé', '250mg', 200, 20, true),
('Quinine', 'QUIN300', 'Antipaludéen', 'Comprimé', '300mg', 300, 25, true),
('Artemether-Lumefantrine', 'ARTE20', 'Antipaludéen combiné (Coartem)', 'Comprimé', '20/120mg', 500, 30, true),
('Cotrimoxazole', 'COTRI480', 'Antibiotique sulfamide', 'Comprimé', '480mg', 150, 20, true),
('Oméprazole', 'OMP20', 'Inhibiteur pompe à protons', 'Gélule', '20mg', 300, 10, true),
('Métformine', 'METF500', 'Antidiabétique oral', 'Comprimé', '500mg', 250, 15, true),
('Amlodipine', 'AMLO5', 'Antihypertenseur', 'Comprimé', '5mg', 280, 10, true),
('Vitamine C', 'VITC500', 'Supplément vitaminique', 'Comprimé', '500mg', 150, 30, true),
('Fer + Acide folique', 'FER200', 'Supplément grossesse', 'Comprimé', '200mg', 180, 25, true),
('Zinc', 'ZINC20', 'Supplément minéral - diarrhée', 'Comprimé', '20mg', 120, 20, true),
('SRO', 'SRO', 'Sel de réhydratation orale', 'Sachet', '27.9g', 100, 50, true),
('Tramadol', 'TRAM50', 'Antalgique opioïde', 'Gélule', '50mg', 400, 10, true),
('Doxycycline', 'DOXY100', 'Antibiotique tétracycline', 'Gélule', '100mg', 220, 15, true),
('Albendazole', 'ALB400', 'Anthelminthique', 'Comprimé', '400mg', 180, 20, true),
('Prednisolone', 'PRED5', 'Corticostéroïde', 'Comprimé', '5mg', 260, 10, true),
('Atenolol', 'ATEN50', 'Bêtabloquant antihypertenseur', 'Comprimé', '50mg', 270, 10, true),
('Glibenclamide', 'GLIB5', 'Antidiabétique sulfonylurée', 'Comprimé', '5mg', 230, 10, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. LOTS DE STOCK (FIFO - plusieurs pays, prix différents)
-- ============================================================

-- Paracétamol - 3 lots
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Cameroun', 150, 200, 200, '2025-10-01', '2027-06-30', 'PARA-CM-2025-001', true FROM public.medicaments WHERE code='PARA500';
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'France', 220, 150, 150, '2025-11-15', '2027-12-31', 'PARA-FR-2025-002', true FROM public.medicaments WHERE code='PARA500';
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 100, 500, 500, '2026-01-10', '2028-03-31', 'PARA-IN-2026-003', true FROM public.medicaments WHERE code='PARA500';

-- Amoxicilline - 2 lots
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 280, 300, 300, '2025-09-01', '2027-09-30', 'AMOX-IN-2025-001', true FROM public.medicaments WHERE code='AMOX500';
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'France', 420, 100, 100, '2025-12-01', '2028-01-31', 'AMOX-FR-2025-002', true FROM public.medicaments WHERE code='AMOX500';

-- Ibuprofène - 2 lots
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 180, 250, 250, '2025-08-15', '2027-08-31', 'IBU-IN-2025-001', true FROM public.medicaments WHERE code='IBU400';
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Cameroun', 210, 180, 180, '2026-01-20', '2028-02-28', 'IBU-CM-2026-002', true FROM public.medicaments WHERE code='IBU400';

-- Métronidazole - 2 lots
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 120, 400, 400, '2025-07-01', '2027-07-31', 'METRO-IN-2025-001', true FROM public.medicaments WHERE code='METRO250';
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Nigéria', 150, 200, 200, '2025-11-01', '2027-11-30', 'METRO-NG-2025-002', true FROM public.medicaments WHERE code='METRO250';

-- Quinine - 2 lots
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'France', 280, 150, 150, '2025-10-01', '2027-10-31', 'QUIN-FR-2025-001', true FROM public.medicaments WHERE code='QUIN300';
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 220, 200, 200, '2026-01-15', '2028-01-31', 'QUIN-IN-2026-002', true FROM public.medicaments WHERE code='QUIN300';

-- Artemether-Lumefantrine (Coartem) - 2 lots (produit critique antipaludéen)
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Suisse', 750, 200, 200, '2025-09-01', '2027-09-30', 'ARTE-CH-2025-001', true FROM public.medicaments WHERE code='ARTE20';
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 580, 300, 300, '2026-02-01', '2028-02-28', 'ARTE-IN-2026-002', true FROM public.medicaments WHERE code='ARTE20';

-- Cotrimoxazole
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 80, 500, 500, '2025-06-01', '2027-06-30', 'COTRI-IN-2025-001', true FROM public.medicaments WHERE code='COTRI480';

-- Oméprazole - 2 lots
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 220, 180, 180, '2025-11-01', '2027-11-30', 'OMP-IN-2025-001', true FROM public.medicaments WHERE code='OMP20';
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'France', 350, 80, 80, '2025-12-15', '2028-12-31', 'OMP-FR-2025-002', true FROM public.medicaments WHERE code='OMP20';

-- Vitamine C
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Cameroun', 80, 1000, 1000, '2026-01-01', '2028-01-31', 'VITC-CM-2026-001', true FROM public.medicaments WHERE code='VITC500';

-- SRO (Sel réhydratation)
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'France', 120, 800, 800, '2025-10-01', '2028-10-31', 'SRO-FR-2025-001', true FROM public.medicaments WHERE code='SRO';

-- Zinc
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 60, 600, 600, '2026-01-01', '2028-06-30', 'ZINC-IN-2026-001', true FROM public.medicaments WHERE code='ZINC20';

-- Fer + Acide folique
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 100, 400, 400, '2025-12-01', '2027-12-31', 'FER-IN-2025-001', true FROM public.medicaments WHERE code='FER200';

-- Tramadol - LOT AVEC STOCK FAIBLE (pour tester les alertes)
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'France', 320, 8, 100, '2025-05-01', '2027-05-31', 'TRAM-FR-2025-001', true FROM public.medicaments WHERE code='TRAM50';

-- Doxycycline - LOT EXPIRANT BIENTOT (pour tester les alertes)
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 160, 50, 200, '2024-03-01', '2026-04-01', 'DOXY-IN-2024-001', true FROM public.medicaments WHERE code='DOXY100';

-- Albendazole
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 120, 350, 350, '2026-01-15', '2028-01-31', 'ALB-IN-2026-001', true FROM public.medicaments WHERE code='ALB400';

-- Prednisolone - STOCK FAIBLE
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'France', 200, 5, 100, '2025-08-01', '2027-08-31', 'PRED-FR-2025-001', true FROM public.medicaments WHERE code='PRED5';

-- Atenolol
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 190, 200, 200, '2025-11-01', '2027-11-30', 'ATEN-IN-2025-001', true FROM public.medicaments WHERE code='ATEN50';

-- Glibenclamide
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 160, 180, 180, '2025-10-01', '2027-10-31', 'GLIB-IN-2025-001', true FROM public.medicaments WHERE code='GLIB5';

-- Métformine
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 180, 220, 220, '2026-01-01', '2028-01-31', 'METF-IN-2026-001', true FROM public.medicaments WHERE code='METF500';

-- Amlodipine
INSERT INTO public.lots (medicament_id, pays_origine, prix_achat, quantite, quantite_initiale, date_reception, date_expiration, numero_lot, actif)
SELECT id, 'Inde', 200, 160, 160, '2025-12-01', '2027-12-31', 'AMLO-IN-2025-001', true FROM public.medicaments WHERE code='AMLO5';

-- ============================================================
-- 3. CLIENTS
-- ============================================================
INSERT INTO public.clients (nom, telephone, adresse, email, actif) VALUES
('Pharmacie Centrale N''Djamena', '+235 66 01 23 45', 'Avenue Charles de Gaulle, N''Djamena', 'centrale@pharmaND.td', true),
('Clinique Al-Mouna', '+235 66 45 67 89', 'Quartier Ambassatna, N''Djamena', 'clinique.almouna@td.com', true),
('Hôpital de la Renaissance', '+235 22 52 44 44', 'Bd du 1er Août, N''Djamena', 'hopital.renaissance@td.gov', true),
('Pharmacie du Peuple', '+235 66 78 90 12', 'Marché Central, N''Djamena', 'pharmaciedupeuple@td.com', true),
('Centre de Santé Farcha', '+235 66 34 56 78', 'Quartier Farcha, N''Djamena', 'csfarcha@sante.td', true),
('Dispensaire Communautaire Moundou', '+235 66 12 34 56', 'Centre-ville, Moundou', 'dispensaire.moundou@td.com', true),
('Pharmacie Moderne Sarh', '+235 66 98 76 54', 'Rue principale, Sarh', 'pharmacie.sarh@td.com', true),
('Clinique Bon Samaritain', '+235 66 55 44 33', 'Quartier Diguel, N''Djamena', 'bonsamaritain@clinique.td', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. COMMANDES DE TEST (historique)
-- ============================================================

-- Commande 1 - Pharmacie Centrale - Payée
WITH cmd AS (
  INSERT INTO public.commandes (client_id, date_commande, total, statut, statut_paiement, numero_facture)
  SELECT id, NOW() - INTERVAL '5 days', 87000, 'livree', 'paye', 'FAC-2026-00001'
  FROM public.clients WHERE nom = 'Pharmacie Centrale N''Djamena'
  RETURNING id
)
INSERT INTO public.commande_items (commande_id, medicament_id, quantite, prix_unitaire)
SELECT cmd.id, m.id,
  CASE m.code
    WHEN 'PARA500' THEN 100
    WHEN 'AMOX500' THEN 50
    WHEN 'ARTE20'  THEN 30
  END,
  CASE m.code
    WHEN 'PARA500' THEN 350
    WHEN 'AMOX500' THEN 630
    WHEN 'ARTE20'  THEN 1250
  END
FROM cmd, public.medicaments m
WHERE m.code IN ('PARA500','AMOX500','ARTE20');

-- Paiement pour commande 1
INSERT INTO public.paiements (commande_id, montant, mode_paiement, date_paiement)
SELECT id, total, 'cash', NOW() - INTERVAL '4 days'
FROM public.commandes WHERE numero_facture = 'FAC-2026-00001';

-- Commande 2 - Clinique Al-Mouna - Payée
WITH cmd AS (
  INSERT INTO public.commandes (client_id, date_commande, total, statut, statut_paiement, numero_facture)
  SELECT id, NOW() - INTERVAL '3 days', 54500, 'livree', 'paye', 'FAC-2026-00002'
  FROM public.clients WHERE nom = 'Clinique Al-Mouna'
  RETURNING id
)
INSERT INTO public.commande_items (commande_id, medicament_id, quantite, prix_unitaire)
SELECT cmd.id, m.id,
  CASE m.code WHEN 'QUIN300' THEN 80 WHEN 'METRO250' THEN 100 WHEN 'IBU400' THEN 60 END,
  CASE m.code WHEN 'QUIN300' THEN 520 WHEN 'METRO250' THEN 320 WHEN 'IBU400' THEN 430 END
FROM cmd, public.medicaments m
WHERE m.code IN ('QUIN300','METRO250','IBU400');

INSERT INTO public.paiements (commande_id, montant, mode_paiement, date_paiement)
SELECT id, total, 'cash', NOW() - INTERVAL '2 days'
FROM public.commandes WHERE numero_facture = 'FAC-2026-00002';

-- Commande 3 - Hôpital Renaissance - En attente paiement
WITH cmd AS (
  INSERT INTO public.commandes (client_id, date_commande, total, statut, statut_paiement, numero_facture)
  SELECT id, NOW() - INTERVAL '1 day', 125000, 'confirmee', 'en_attente', 'FAC-2026-00003'
  FROM public.clients WHERE nom = 'Hôpital de la Renaissance'
  RETURNING id
)
INSERT INTO public.commande_items (commande_id, medicament_id, quantite, prix_unitaire)
SELECT cmd.id, m.id,
  CASE m.code WHEN 'ARTE20' THEN 50 WHEN 'PARA500' THEN 200 WHEN 'AMOX500' THEN 80 WHEN 'SRO' THEN 100 END,
  CASE m.code WHEN 'ARTE20' THEN 1250 WHEN 'PARA500' THEN 350 WHEN 'AMOX500' THEN 630 WHEN 'SRO' THEN 220 END
FROM cmd, public.medicaments m
WHERE m.code IN ('ARTE20','PARA500','AMOX500','SRO');

-- Commande 4 - Pharmacie du Peuple - En attente
WITH cmd AS (
  INSERT INTO public.commandes (client_id, date_commande, total, statut, statut_paiement, numero_facture)
  SELECT id, NOW() - INTERVAL '2 hours', 43200, 'en_attente', 'en_attente', 'FAC-2026-00004'
  FROM public.clients WHERE nom = 'Pharmacie du Peuple'
  RETURNING id
)
INSERT INTO public.commande_items (commande_id, medicament_id, quantite, prix_unitaire)
SELECT cmd.id, m.id,
  CASE m.code WHEN 'OMP20' THEN 40 WHEN 'VITC500' THEN 100 WHEN 'ZINC20' THEN 60 WHEN 'FER200' THEN 50 END,
  CASE m.code WHEN 'OMP20' THEN 520 WHEN 'VITC500' THEN 230 WHEN 'ZINC20' THEN 180 WHEN 'FER200' THEN 280 END
FROM cmd, public.medicaments m
WHERE m.code IN ('OMP20','VITC500','ZINC20','FER200');

-- Commande 5 - Centre Santé Farcha - Aujourd'hui
WITH cmd AS (
  INSERT INTO public.commandes (client_id, date_commande, total, statut, statut_paiement, numero_facture)
  SELECT id, NOW() - INTERVAL '30 minutes', 38600, 'en_attente', 'en_attente', 'FAC-2026-00005'
  FROM public.clients WHERE nom = 'Centre de Santé Farcha'
  RETURNING id
)
INSERT INTO public.commande_items (commande_id, medicament_id, quantite, prix_unitaire)
SELECT cmd.id, m.id,
  CASE m.code WHEN 'COTRI480' THEN 120 WHEN 'DOXY100' THEN 40 WHEN 'ALB400' THEN 80 END,
  CASE m.code WHEN 'COTRI480' THEN 230 WHEN 'DOXY100' THEN 380 WHEN 'ALB400' THEN 300 END
FROM cmd, public.medicaments m
WHERE m.code IN ('COTRI480','DOXY100','ALB400');

-- ============================================================
-- 5. LIER LE COMPTE "ali" À UNE FICHE CLIENT
-- (Remplacez l'UUID si différent du vôtre)
-- ============================================================
-- D'abord vérifiez votre UUID : SELECT id, email FROM auth.users;
-- Puis décommentez et adaptez :
/*
INSERT INTO public.clients (nom, telephone, adresse, email, user_id, actif)
VALUES ('Ali Test', '+235 66 00 00 01', 'N''Djamena', 'ali@test.com', '2a91bc89-da44-4cf7-b4c4-ced38c915bb6', true)
ON CONFLICT DO NOTHING;
*/

-- ============================================================
-- VÉRIFICATION FINALE
-- ============================================================
SELECT 'Médicaments' as table_name, COUNT(*) as nb FROM public.medicaments
UNION ALL SELECT 'Lots', COUNT(*) FROM public.lots
UNION ALL SELECT 'Clients', COUNT(*) FROM public.clients
UNION ALL SELECT 'Commandes', COUNT(*) FROM public.commandes
UNION ALL SELECT 'Items commandes', COUNT(*) FROM public.commande_items
UNION ALL SELECT 'Paiements', COUNT(*) FROM public.paiements;
