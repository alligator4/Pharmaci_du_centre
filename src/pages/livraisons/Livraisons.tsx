import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import { useAuth } from '../../contexts/AuthContext'
import { Truck, Upload, CheckCircle, Clock, XCircle, Eye, Image, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUT_LABELS: Record<string, string> = {
  assignee: 'Assignée', en_cours: 'En cours', livree: 'Livrée', echec: 'Échec',
}
const STATUT_COLORS: Record<string, string> = {
  assignee: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-amber-100 text-amber-700',
  livree: 'bg-green-100 text-green-700',
  echec: 'bg-red-100 text-red-700',
}

export default function Livraisons() {
  const { profile, isRole } = useAuth()
  const [livraisons, setLivraisons] = useState<any[]>([])
  const [livreurs, setLivreurs] = useState<any[]>([])
  const [commandes, setCommandes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLiv, setSelectedLiv] = useState<any | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const [showPreuve, setShowPreuve] = useState(false)
  const [assignForm, setAssignForm] = useState({ commande_id: '', livreur_id: '' })
  const [uploading, setUploading] = useState(false)
  const [filtre, setFiltre] = useState<'all' | 'assignee' | 'en_cours' | 'livree'>('all')
  const fileRef = useRef<HTMLInputElement>(null)

  const isStaff = isRole('superadmin', 'admin', 'employe')
  const isLivreur = isRole('livreur')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      if (isStaff) {
        // 1. Livraisons brutes
        const { data: livs, error: livErr } = await supabase
          .from('livraisons')
          .select('*')
          .order('created_at', { ascending: false })
        if (livErr) { toast.error('Erreur chargement livraisons'); setLoading(false); return }

        // 2. Profils (pour noms livreurs)
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, name, email, role')
        const profilesMap: Record<string, any> = {}
        for (const p of (allProfiles ?? [])) profilesMap[p.id] = p

        // 3. Commandes concernées (livraisons + éligibles)
        const commandeIds = [...new Set((livs ?? []).map(l => l.commande_id))]
        let commandesMap: Record<string, any> = {}

        if (commandeIds.length > 0) {
          const { data: cmdData } = await supabase
            .from('commandes')
            .select('id, numero_facture, total, statut, client_id')
            .in('id', commandeIds)
          for (const c of (cmdData ?? [])) commandesMap[c.id] = c

          // 4. Clients concernés
          const clientIds = [...new Set(Object.values(commandesMap).map((c: any) => c.client_id))]
          if (clientIds.length > 0) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('id, nom, telephone, adresse')
              .in('id', clientIds)
            const clientsMap: Record<string, any> = {}
            for (const cl of (clientData ?? [])) clientsMap[cl.id] = cl
            for (const id in commandesMap) {
              commandesMap[id].client = clientsMap[commandesMap[id].client_id] ?? null
            }
          }
        }

        // 5. Fusionner tout
        const livsEnriched = (livs ?? []).map(l => ({
          ...l,
          livreur: profilesMap[l.livreur_id] ?? null,
          commande: commandesMap[l.commande_id] ?? null,
        }))
        setLivraisons(livsEnriched)
        setLivreurs((allProfiles ?? []).filter(p => p.role === 'livreur'))

        // 6. Commandes éligibles à l'assignation
        const assignedIds = new Set(livsEnriched.filter(l => l.statut !== 'echec').map(l => l.commande_id))
        const { data: eligibles } = await supabase
          .from('commandes')
          .select('id, numero_facture, total, statut, client_id')
          .in('statut', ['confirmee', 'preparee'])
          .order('date_commande', { ascending: false })

        const clientIds2 = [...new Set((eligibles ?? []).map(c => c.client_id))]
        let clientsMap2: Record<string, any> = {}
        if (clientIds2.length > 0) {
          const { data: cl2 } = await supabase.from('clients').select('id, nom').in('id', clientIds2)
          for (const c of (cl2 ?? [])) clientsMap2[c.id] = c
        }
        const eligiblesWithClient = (eligibles ?? [])
          .filter(c => !assignedIds.has(c.id))
          .map(c => ({ ...c, client: clientsMap2[c.client_id] ?? null }))
        setCommandes(eligiblesWithClient)

      } else if (isLivreur) {
        const { data: livs, error: livErr } = await supabase
          .from('livraisons')
          .select('*')
          .eq('livreur_id', profile!.id)
          .order('created_at', { ascending: false })
        if (livErr) { toast.error('Erreur chargement livraisons'); setLoading(false); return }

        const commandeIds = [...new Set((livs ?? []).map(l => l.commande_id))]
        let commandesMap: Record<string, any> = {}
        if (commandeIds.length > 0) {
          const { data: cmdData } = await supabase
            .from('commandes')
            .select('id, numero_facture, total, client_id')
            .in('id', commandeIds)
          for (const c of (cmdData ?? [])) commandesMap[c.id] = c

          const clientIds = [...new Set(Object.values(commandesMap).map((c: any) => c.client_id))]
          if (clientIds.length > 0) {
            const { data: clientData } = await supabase
              .from('clients').select('id, nom, telephone, adresse').in('id', clientIds)
            const clientsMap: Record<string, any> = {}
            for (const cl of (clientData ?? [])) clientsMap[cl.id] = cl
            for (const id in commandesMap) {
              commandesMap[id].client = clientsMap[commandesMap[id].client_id] ?? null
            }
          }
        }
        setLivraisons((livs ?? []).map(l => ({ ...l, commande: commandesMap[l.commande_id] ?? null })))
      }
    } catch (e: any) {
      toast.error('Erreur : ' + (e?.message ?? 'Inconnue'))
    }
    setLoading(false)
  }

  async function handleAssign() {
    if (!assignForm.commande_id || !assignForm.livreur_id) {
      toast.error('Sélectionnez une commande et un livreur')
      return
    }
    const { error } = await supabase.from('livraisons').insert({
      commande_id: assignForm.commande_id,
      livreur_id: assignForm.livreur_id,
      statut: 'assignee',
    })
    if (error) { toast.error(error.message); return }

    // Passer la commande en "preparee" si elle était encore "confirmee"
    await supabase.from('commandes')
      .update({ statut: 'preparee' })
      .eq('id', assignForm.commande_id)
      .eq('statut', 'confirmee')

    toast.success('Livraison assignée')
    setShowAssign(false)
    setAssignForm({ commande_id: '', livreur_id: '' })
    fetchData()
  }

  async function updateStatut(id: string, statut: string) {
    const liv = livraisons.find(l => l.id === id)

    if (statut === 'livree' && !liv?.preuve_url) {
      toast.error('Ajoutez une preuve de livraison avant de marquer comme livrée')
      return
    }

    const payload: any = { statut }
    if (statut === 'livree') payload.date_livraison = new Date().toISOString()
    if (statut === 'en_cours') payload.date_assignation = liv?.date_assignation // inchangé

    const { error } = await supabase.from('livraisons').update(payload).eq('id', id)
    if (error) { toast.error(error.message); return }

    if (statut === 'livree') {
      await supabase.from('commandes').update({ statut: 'livree' }).eq('id', liv.commande_id)
    }

    toast.success('Statut mis à jour')
    fetchData()
  }

  async function handleUploadPreuve(livId: string, file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${livId}-${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('preuves_livraison')
      .upload(path, file, { contentType: file.type })

    if (error) {
      // Bucket peut ne pas exister encore — informer clairement
      if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
        toast.error('Bucket "preuves_livraison" introuvable. Créez-le dans Supabase Storage.')
      } else {
        toast.error('Erreur upload : ' + error.message)
      }
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('preuves_livraison').getPublicUrl(data.path)
    const type = file.type.startsWith('image/') ? 'photo' : 'pdf'

    const { error: updateErr } = await supabase
      .from('livraisons')
      .update({ preuve_url: publicUrl, preuve_type: type })
      .eq('id', livId)

    if (updateErr) { toast.error(updateErr.message); setUploading(false); return }

    toast.success('Preuve uploadée avec succès')
    setShowPreuve(false)
    setSelectedLiv(null)
    fetchData()
    setUploading(false)
  }

  const filtered = livraisons.filter(l => filtre === 'all' || l.statut === filtre)

  return (
    <Layout title="Livraisons">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {(['all','assignee','en_cours','livree'] as const).map(f => (
              <button key={f} onClick={() => setFiltre(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filtre === f ? 'bg-teal-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                {f === 'all' ? 'Toutes' : STATUT_LABELS[f]}
                <span className="ml-1.5 opacity-70">
                  ({f === 'all' ? livraisons.length : livraisons.filter(l => l.statut === f).length})
                </span>
              </button>
            ))}
          </div>

          {isStaff && (
            <button onClick={() => setShowAssign(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors shrink-0">
              <Truck size={16} /> Assigner une livraison
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-slate-400">
              <Truck size={40} className="mx-auto mb-3 opacity-30" />
              <p>{isLivreur ? 'Aucune livraison assignée' : 'Aucune livraison'}</p>
              {isStaff && commandes.length === 0 && livraisons.length === 0 && (
                <p className="text-xs mt-2">Les commandes doivent être au statut "Confirmée" ou "Préparée" pour être assignables.</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(liv => (
                <div key={liv.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-slate-800">
                          #{liv.commande?.numero_facture || liv.commande_id?.slice(-6)}
                        </p>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[liv.statut]}`}>
                          {liv.statut === 'assignee' && <Clock size={11} />}
                          {liv.statut === 'en_cours' && <Truck size={11} />}
                          {liv.statut === 'livree' && <CheckCircle size={11} />}
                          {liv.statut === 'echec' && <XCircle size={11} />}
                          {STATUT_LABELS[liv.statut]}
                        </span>
                        {liv.preuve_url && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
                            <Image size={10} /> Preuve ✓
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-700">
                        <span className="text-slate-400">Client : </span>
                        <span className="font-medium">{liv.commande?.client?.nom ?? '—'}</span>
                        {liv.commande?.client?.telephone && (
                          <span className="text-slate-400 ml-2 text-xs">{liv.commande.client.telephone}</span>
                        )}
                      </p>
                      {liv.commande?.client?.adresse && (
                        <p className="text-xs text-slate-400 mt-0.5">{liv.commande.client.adresse}</p>
                      )}

                      {/* Nom du livreur — affiché seulement pour le staff */}
                      {isStaff && liv.livreur && (
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="text-slate-400">Livreur : </span>
                          <span className="font-medium text-slate-700">{liv.livreur.name}</span>
                        </p>
                      )}

                      <p className="text-sm font-semibold text-teal-600 mt-1">
                        {liv.commande?.total?.toLocaleString('fr-FR')} FCFA
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Assignée le {format(new Date(liv.date_assignation), 'd MMM yyyy à HH:mm', { locale: fr })}
                        {liv.date_livraison && (
                          <span className="text-green-600 font-medium"> · Livrée le {format(new Date(liv.date_livraison), 'd MMM yyyy', { locale: fr })}</span>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {liv.preuve_url && (
                        <a href={liv.preuve_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                          <Eye size={12} /> Voir preuve
                        </a>
                      )}

                      {liv.statut !== 'livree' && liv.statut !== 'echec' && (
                        <button
                          onClick={() => { setSelectedLiv(liv); setShowPreuve(true) }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                          <Upload size={12} />
                          {liv.preuve_url ? 'Changer preuve' : 'Ajouter preuve'}
                        </button>
                      )}

                      {/* Livreur : prise en charge et marquage livré */}
                      {(isLivreur ? liv.livreur_id === profile?.id : isStaff) && (
                        <>
                          {liv.statut === 'assignee' && (
                            <button onClick={() => updateStatut(liv.id, 'en_cours')}
                              className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors font-medium">
                              Prendre en charge
                            </button>
                          )}
                          {liv.statut === 'en_cours' && (
                            <button onClick={() => updateStatut(liv.id, 'livree')}
                              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${liv.preuve_url ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                              title={!liv.preuve_url ? 'Ajoutez une preuve avant de marquer comme livrée' : ''}>
                              ✓ Marquer livrée
                            </button>
                          )}
                        </>
                      )}

                      {isStaff && liv.statut !== 'livree' && liv.statut !== 'echec' && (
                        <button onClick={() => updateStatut(liv.id, 'echec')}
                          className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                          Échec
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal assigner */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Assigner une livraison</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Commande à livrer *
                  <span className="ml-2 text-xs font-normal text-slate-400">(confirmée ou préparée)</span>
                </label>
                {commandes.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    <Package size={16} />
                    Aucune commande disponible. Les commandes doivent être au statut "Confirmée" ou "Préparée".
                  </div>
                ) : (
                  <select value={assignForm.commande_id} onChange={e => setAssignForm(f => ({ ...f, commande_id: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Sélectionner une commande...</option>
                    {commandes.map(c => (
                      <option key={c.id} value={c.id}>
                        #{c.numero_facture || c.id.slice(-6)} — {c.client?.nom} — {c.total?.toLocaleString('fr-FR')} FCFA
                        {c.statut === 'confirmee' ? ' [Confirmée]' : ' [Préparée]'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Livreur *</label>
                {livreurs.length === 0 ? (
                  <p className="text-xs text-amber-600 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    Aucun livreur actif. Créez un utilisateur avec le rôle "Livreur" dans la section Utilisateurs.
                  </p>
                ) : (
                  <select value={assignForm.livreur_id} onChange={e => setAssignForm(f => ({ ...f, livreur_id: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Sélectionner un livreur...</option>
                    {livreurs.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowAssign(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={handleAssign} disabled={!assignForm.commande_id || !assignForm.livreur_id}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 transition-colors">
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal upload preuve */}
      {showPreuve && selectedLiv && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Preuve de livraison</h2>
              <p className="text-sm text-slate-500 mt-1">
                Commande #{selectedLiv.commande?.numero_facture || selectedLiv.commande_id?.slice(-6)}
                {' · '}{selectedLiv.commande?.client?.nom}
              </p>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-600">
                Uploadez une <strong>photo</strong> (signature, bon de livraison) ou un <strong>PDF</strong>.
              </p>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-teal-400 hover:bg-teal-50 transition-colors">
                <Upload size={28} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-medium text-slate-600">
                  {uploading ? 'Upload en cours...' : 'Cliquez pour sélectionner'}
                </p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF acceptés</p>
              </button>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadPreuve(selectedLiv.id, file)
                }} />
              {!uploading && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                  La commande ne pourra être marquée comme livrée qu'après upload de cette preuve.
                </p>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button onClick={() => { setShowPreuve(false); setSelectedLiv(null) }} disabled={uploading}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
