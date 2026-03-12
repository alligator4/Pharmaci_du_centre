export type UserRole = 'superadmin' | 'admin' | 'employe' | 'client'

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  actif: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  nom: string
  telephone?: string
  adresse?: string
  email?: string
  user_id?: string
  actif: boolean
  created_at: string
}

export interface Medicament {
  id: string
  nom: string
  code?: string
  description?: string
  forme?: string
  dosage?: string
  marge: number
  seuil_alerte: number
  actif: boolean
  created_at: string
}

export interface Lot {
  id: string
  medicament_id: string
  pays_origine: string
  prix_achat: number
  quantite: number
  quantite_initiale: number
  date_reception: string
  date_expiration: string
  numero_lot: string
  actif: boolean
  created_at: string
  medicament?: Medicament
}

export type StatutCommande = 'en_attente' | 'confirmee' | 'preparee' | 'livree' | 'annulee'
export type StatutPaiement = 'en_attente' | 'paye' | 'annule'

export interface Commande {
  id: string
  client_id: string
  date_commande: string
  total: number
  statut: StatutCommande
  statut_paiement: StatutPaiement
  numero_facture?: string
  facture_url?: string
  notes?: string
  created_at: string
  client?: Client
  items?: CommandeItem[]
}

export interface CommandeItem {
  id: string
  commande_id: string
  medicament_id: string
  quantite: number
  prix_unitaire: number
  medicament?: Medicament
}

export interface Paiement {
  id: string
  commande_id: string
  montant: number
  date_paiement: string
  mode_paiement: string
  notes?: string
  enregistre_par?: string
  created_at: string
  commande?: Commande & { client?: Client }
}

export interface StockMedicament {
  medicament_id: string
  nom: string
  code?: string
  marge: number
  seuil_alerte: number
  quantite_totale: number
  nb_lots: number
  prix_achat_min: number
  date_expiration_proche?: string
}

export interface CartItem {
  medicament: Medicament
  quantite: number
  prix_unitaire: number
}
