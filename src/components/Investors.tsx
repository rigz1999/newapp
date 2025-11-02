import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Phone, MapPin, Building2, AlertCircle, Upload, Check, X, Edit2, Briefcase, Layers, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Investor {
  id: string;
  id_investisseur: string;
  nom_raison_sociale: string;
  type: 'Physique' | 'Morale';
  email: string | null;
  cgp: string | null;
  email_cgp: string | null;
  siren: number | null;
  residence_fiscale: string | null;
  telephone: string | null;
  adresse: string | null;
  rib_file_path: string | null;
  rib_uploaded_at: string | null;
  rib_status: 'manquant' | 'en_attente' | 'valide';
  total_investi: number;
  nb_souscriptions: number;
  projets: string[];
  tranches: string[];
  created_at: string;
}

export default function Investors() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [uploadingRib, setUploadingRib] = useState<string | null>(null);

  useEffect(() => {
    fetchInvestors();
  }, []);

  const fetchInvestors = async () => {
    setLoading(true);

    try {
      const { data: investorsData, error: investorsError } = await supabase
        .from('investisseurs')
        .select(`
          *,
          souscriptions (
            id,
            montant_investi,
            tranches (
              tranche_name,
              projets (nom_projet)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (investorsError) throw investorsError;

      const processedInvestors: Investor[] = investorsData.map((inv) => {
        const total_investi = inv.souscriptions.reduce(
          (sum: number, sub: any) => sum + (sub.montant_investi || 0),
          0
        );

        const projets = [
          ...new Set(
            inv.souscriptions
              .map((sub: any) => sub.tranches?.projets?.nom_projet)
              .filter(Boolean)
          )
        ];

        const tranches = [
          ...new Set(
            inv.souscriptions
              .map((sub: any) => sub.tranches?.tranche_name)
              .filter(Boolean)
          )
        ];

        return {
          id: inv.id,
          id_investisseur: inv.id_investisseur,
          nom_raison_sociale: inv.nom_raison_sociale,
          type: inv.type,
          email: inv.email,
          cgp: inv.cgp,
          email_cgp: inv.email_cgp,
          siren: inv.siren,
          residence_fiscale: inv.residence_fiscale,
          telephone: inv.telephone,
          adresse: inv.adresse,
          rib_file_path: inv.rib_file_path,
          rib_uploaded_at: inv.rib_uploaded_at,
          rib_status: inv.rib_status || 'manquant',
          total_investi,
          nb_souscriptions: inv.souscriptions.length,
          projets,
          tranches,
          created_at: inv.created_at
        };
      });

      setInvestors(processedInvestors);
    } catch (error) {
      console.error('Error fetching investors:', error);
      alert('Erreur lors du chargement des investisseurs');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvestor) return;

    try {
      const { error } = await supabase
        .from('investisseurs')
        .update({
          nom_raison_sociale: editFormData.nom_raison_sociale,
          type: editFormData.type,
          email: editFormData.email,
          cgp: editFormData.cgp,
          email_cgp: editFormData.email_cgp,
          siren: editFormData.siren,
          residence_fiscale: editFormData.residence_fiscale,
          telephone: editFormData.telephone,
          adresse: editFormData.adresse,
        })
        .eq('id', editingInvestor.id);

      if (error) throw error;

      alert('Investisseur mis à jour avec succès');
      setEditingInvestor(null);
      setEditFormData({});
      fetchInvestors();
    } catch (error) {
      console.error('Error updating investor:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleRibUpload = async (investorId: string, file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Veuillez télécharger une image ou un PDF');
      return;
    }

    setUploadingRib(investorId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${investorId}_${Date.now()}.${fileExt}`;
      const filePath = `ribs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('investisseurs')
        .update({
          rib_file_path: filePath,
          rib_uploaded_at: new Date().toISOString(),
          rib_status: 'en_attente'
        })
        .eq('id', investorId);

      if (updateError) throw updateError;

      alert('RIB téléchargé avec succès');
      fetchInvestors();
    } catch (error) {
      console.error('Error uploading RIB:', error);
      alert('Erreur lors du téléchargement du RIB');
    } finally {
      setUploadingRib(null);
    }
  };

  const getRibStatusBadge = (status: string) => {
    switch (status) {
      case 'valide':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            Validé
          </span>
        );
      case 'en_attente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
            <Clock className="w-3.5 h-3.5" />
            En attente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
            <XCircle className="w-3.5 h-3.5" />
            Manquant
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Investisseurs</h1>
        <div className="text-sm text-slate-600">
          {investors.length} investisseur{investors.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid gap-4">
        {investors.map((investor) => (
          <div
            key={investor.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {investor.nom_raison_sociale.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      {investor.nom_raison_sociale}
                    </h3>
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                      investor.type === 'Physique'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {investor.type}
                    </span>
                    {getRibStatusBadge(investor.rib_status)}
                  </div>

                  <p className="text-sm text-slate-600 mb-3">ID: {investor.id_investisseur}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Total investi</p>
                      <p className="text-lg font-bold text-slate-900">
                        {investor.total_investi.toLocaleString('fr-FR')} €
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Souscriptions</p>
                      <p className="text-lg font-bold text-slate-900">
                        {investor.nb_souscriptions}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Projets</p>
                      <p className="text-lg font-bold text-slate-900">
                        {investor.projets.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Tranches</p>
                      <p className="text-lg font-bold text-slate-900">
                        {investor.tranches.length}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                    {investor.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4" />
                        {investor.email}
                      </span>
                    )}
                    {investor.telephone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4" />
                        {investor.telephone}
                      </span>
                    )}
                    {investor.cgp && (
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <User className="w-4 h-4" />
                        CGP: {investor.cgp}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedInvestor(investor)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Détails
                </button>
                <button
                  onClick={() => {
                    setEditingInvestor(investor);
                    setEditFormData(investor);
                  }}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-2xl font-bold">
                    {selectedInvestor.nom_raison_sociale.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedInvestor.nom_raison_sociale}</h2>
                    <p className="text-blue-100">{selectedInvestor.id_investisseur}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInvestor(null)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {selectedInvestor.cgp && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-600" />
                    Conseiller en Gestion de Patrimoine
                  </h4>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-slate-900">
                        {selectedInvestor.cgp}
                      </p>
                      {selectedInvestor.email_cgp && (
                        <a
                          href={`mailto:${selectedInvestor.email_cgp}`}
                          className="text-sm text-amber-700 hover:text-amber-900 flex items-center gap-1 mt-1"
                        >
                          <Mail className="w-4 h-4" />
                          {selectedInvestor.email_cgp}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900">Informations générales</h4>
                  {selectedInvestor.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{selectedInvestor.email}</span>
                    </div>
                  )}
                  {selectedInvestor.telephone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{selectedInvestor.telephone}</span>
                    </div>
                  )}
                  {selectedInvestor.adresse && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{selectedInvestor.adresse}</span>
                    </div>
                  )}
                  {selectedInvestor.siren && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>SIREN: {selectedInvestor.siren}</span>
                    </div>
                  )}
                  {selectedInvestor.residence_fiscale && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>Résidence fiscale: {selectedInvestor.residence_fiscale}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900">RIB</h4>
                  <div className="flex items-center gap-2">
                    {getRibStatusBadge(selectedInvestor.rib_status)}
                  </div>
                  {selectedInvestor.rib_uploaded_at && (
                    <p className="text-xs text-slate-500">
                      Téléchargé le {new Date(selectedInvestor.rib_uploaded_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleRibUpload(selectedInvestor.id, file);
                      }}
                      className="hidden"
                      disabled={uploadingRib === selectedInvestor.id}
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm">
                      <Upload className="w-4 h-4" />
                      {uploadingRib === selectedInvestor.id ? 'Téléchargement...' : 'Télécharger RIB'}
                    </span>
                  </label>
                </div>
              </div>

              {selectedInvestor.projets && selectedInvestor.projets.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    Projets ({selectedInvestor.projets.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedInvestor.projets.map((projet, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
                      >
                        {projet}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedInvestor.tranches && selectedInvestor.tranches.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600" />
                    Tranches ({selectedInvestor.tranches.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedInvestor.tranches.map((tranche, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-purple-100 text-purple-800 text-sm font-medium rounded-full"
                      >
                        {tranche}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">Modifier l'investisseur</h2>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom / Raison Sociale
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.nom_raison_sociale || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, nom_raison_sociale: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type
                </label>
                <select
                  value={editFormData.type || 'Physique'}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Physique">Physique</option>
                  <option value="Morale">Morale</option>
                </select>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-600" />
                  Conseiller en Gestion de Patrimoine
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nom du CGP
                    </label>
                    <input
                      type="text"
                      value={editFormData.cgp || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, cgp: e.target.value })}
                      placeholder="Ex: Jean Dupont"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email du CGP
                    </label>
                    <input
                      type="email"
                      value={editFormData.email_cgp || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email_cgp: e.target.value })}
                      placeholder="cgp@email.com"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={editFormData.telephone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Adresse
                </label>
                <input
                  type="text"
                  value={editFormData.adresse || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, adresse: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    SIREN
                  </label>
                  <input
                    type="number"
                    value={editFormData.siren || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, siren: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Résidence fiscale
                  </label>
                  <input
                    type="text"
                    value={editFormData.residence_fiscale || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, residence_fiscale: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingInvestor(null);
                    setEditFormData({});
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
