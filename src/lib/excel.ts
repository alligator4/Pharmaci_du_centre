import * as XLSX from 'xlsx'
import { format } from 'date-fns'

export function exportCommandesToExcel(commandes: any[]) {
  const data = commandes.map(c => ({
    'N° Facture': c.numero_facture || c.id.slice(-8),
    'Client': c.expand?.client?.nom || c.client?.nom || '—',
    'Date': format(new Date(c.date_commande), 'dd/MM/yyyy HH:mm'),
    'Total (FCFA)': c.total,
    'Statut': c.statut,
    'Paiement': c.statut_paiement,
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Commandes')

  ws['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ]

  XLSX.writeFile(wb, `commandes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}

export function exportStockToExcel(stocks: any[], lots: any[]) {
  const stockData = stocks.map(s => ({
    'Médicament': s.nom,
    'Code': s.code || '',
    'Quantité totale': s.quantite_totale,
    'Nb Lots': s.nb_lots,
    'Prix achat min (FCFA)': s.prix_achat_min || 0,
    'Marge (FCFA)': s.marge,
    'Prix vente min (FCFA)': s.prix_achat_min ? s.prix_achat_min + s.marge : 0,
    'Seuil alerte': s.seuil_alerte,
    'Prochaine expiration': s.date_expiration_proche || '',
  }))

  const lotsData = lots.map(l => ({
    'Médicament': l.medicament?.nom || '',
    'Pays origine': l.pays_origine,
    'N° Lot': l.numero_lot,
    'Prix achat (FCFA)': l.prix_achat,
    'Quantité restante': l.quantite,
    'Quantité initiale': l.quantite_initiale,
    'Date réception': l.date_reception,
    'Date expiration': l.date_expiration,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stockData), 'Stock')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lotsData), 'Lots')

  XLSX.writeFile(wb, `stock-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}

export function exportVentesToExcel(items: any[]) {
  const data = items.map(item => ({
    'Date': format(new Date(item.created || item.commande?.date_commande), 'dd/MM/yyyy'),
    'N° Commande': item.expand?.commande?.numero_facture || item.commande?.numero_facture || (typeof item.commande === 'string' ? item.commande.slice(-8) : '') || '',
    'Client': item.expand?.commande?.expand?.client?.nom || '',
    'Médicament': item.expand?.medicament?.nom || '',
    'Code': item.expand?.medicament?.code || '',
    'Quantité': item.quantite,
    'Prix unitaire (FCFA)': item.prix_unitaire,
    'Total (FCFA)': item.quantite * item.prix_unitaire,
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ventes')

  XLSX.writeFile(wb, `ventes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}
