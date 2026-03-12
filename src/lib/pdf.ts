import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from './supabase'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export async function generateFacturePDF(commande: any): Promise<string> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const margin = 20
  const pageWidth = doc.internal.pageSize.width

  doc.setFillColor(15, 76, 129)
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('PHARMAGROSS TCHAD', margin, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text("Grossiste Pharmaceutique - N'Djamena, Tchad", margin, 26)
  doc.text('Tel: +235 XX XX XX XX', margin, 32)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURE', pageWidth - margin - 30, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`N°: ${commande.numero_facture || commande.id.slice(-8)}`, pageWidth - margin - 50, 28)
  doc.text(`Date: ${format(new Date(commande.date_commande), 'dd/MM/yyyy', { locale: fr })}`, pageWidth - margin - 50, 34)

  doc.setTextColor(30, 41, 59)

  let y = 55

  doc.setFillColor(248, 250, 252)
  doc.rect(margin, y, pageWidth - 2 * margin, 30, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(margin, y, pageWidth - 2 * margin, 30, 'D')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURÉ À :', margin + 5, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(commande.client?.nom || '—', margin + 5, y + 15)
  if (commande.client?.telephone) doc.text(`Tél: ${commande.client.telephone}`, margin + 5, y + 21)
  if (commande.client?.adresse) doc.text(commande.client.adresse, margin + 5, y + 27)

  y += 40

  const items = commande.items ?? []
  const tableData = items.map((item: any) => [
    item.medicament?.nom || '—',
    item.medicament?.code || '—',
    item.quantite.toString(),
    `${item.prix_unitaire.toLocaleString('fr-FR')} FCFA`,
    `${(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} FCFA`,
  ])

  autoTable(doc, {
    startY: y,
    head: [['Médicament', 'Code', 'Qté', 'Prix unit.', 'Sous-total']],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [15, 76, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
    foot: [[
      { content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fontSize: 12, fillColor: [248, 250, 252] } },
      { content: `${commande.total.toLocaleString('fr-FR')} FCFA`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 12, textColor: [15, 76, 129], fillColor: [248, 250, 252] } }
    ]]
  })

  const finalY = (doc as any).lastAutoTable.finalY + 15

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('Modalités de paiement: Espèces uniquement', margin, finalY)
  doc.text(`Statut paiement: ${commande.statut_paiement === 'paye' ? 'PAYÉ' : 'EN ATTENTE'}`, margin, finalY + 6)

  const signY = finalY + 20
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text('Signature / Cachet:', pageWidth - margin - 60, signY)
  doc.rect(pageWidth - margin - 60, signY + 5, 55, 25, 'D')

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Document généré automatiquement - PharmaGross Tchad', margin, doc.internal.pageSize.height - 10)

  const pdfBlob = doc.output('blob')
  const fileName = `facture-${commande.numero_facture || commande.id.slice(-8)}-${Date.now()}.pdf`

  try {
    const { data: uploadData } = await supabase.storage
      .from('factures')
      .upload(fileName, pdfBlob, { contentType: 'application/pdf' })

    if (uploadData) {
      const { data: { publicUrl } } = supabase.storage.from('factures').getPublicUrl(uploadData.path)
      await supabase.from('commandes').update({ facture_url: publicUrl }).eq('id', commande.id)
    }
  } catch {
    // Storage optionnel, continuer sans
  }

  return URL.createObjectURL(pdfBlob)
}
