import PocketBase from 'pocketbase'

const pbUrl = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090'

export const pb = new PocketBase(pbUrl)

pb.autoCancellation(false)

/**
 * Calcule le stock agrégé par médicament à partir des lots actifs
 * (remplace la vue PostgreSQL stock_medicament)
 */
export function computeStockFromLots(lots: any[]): import('../types').StockMedicament[] {
  const map: Record<string, import('../types').StockMedicament> = {}

  for (const lot of lots) {
    if (!lot.expand?.medicament && !lot.medicament_id) continue
    const med = lot.expand?.medicament || {}
    const medId = lot.medicament_id || lot.medicament

    if (!map[medId]) {
      map[medId] = {
        medicament_id: medId,
        nom: med.nom || '',
        code: med.code,
        marge: med.marge || 0,
        seuil_alerte: med.seuil_alerte || 10,
        quantite_totale: 0,
        nb_lots: 0,
        prix_achat_min: Infinity,
        date_expiration_proche: undefined,
      }
    }

    if (lot.quantite > 0) {
      map[medId].quantite_totale += lot.quantite
      map[medId].nb_lots += 1
      if (lot.prix_achat < map[medId].prix_achat_min) {
        map[medId].prix_achat_min = lot.prix_achat
      }
      if (!map[medId].date_expiration_proche || lot.date_expiration < map[medId].date_expiration_proche!) {
        map[medId].date_expiration_proche = lot.date_expiration
      }
    }
  }

  return Object.values(map).map(s => ({
    ...s,
    prix_achat_min: s.prix_achat_min === Infinity ? 0 : s.prix_achat_min,
  }))
}

/**
 * Déduit le stock FIFO lors d'une commande :
 * prend les lots les moins chers d'abord, puis les plus anciens
 */
export async function deductFifoStock(medicamentId: string, quantite: number): Promise<void> {
  const lots = await pb.collection('lots').getFullList({
    filter: `medicament = "${medicamentId}" && actif = true && quantite > 0`,
    sort: 'prix_achat,date_reception',
  })

  let remaining = quantite
  for (const lot of lots) {
    if (remaining <= 0) break
    const used = Math.min(lot.quantite, remaining)
    await pb.collection('lots').update(lot.id, { quantite: lot.quantite - used })
    remaining -= used
  }
}
