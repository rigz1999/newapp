// ============================================
// UPDATED INVESTORS PAGE CODE
// ============================================
// This ensures CGP comes from investisseurs table (single source of truth)

// TypeScript Interface
interface Investor {
  id: string;
  id_investisseur: string;
  nom_raison_sociale: string;
  type: 'Physique' | 'Morale';
  email: string | null;
  
  // CGP fields (now from investisseurs table)
  cgp: string | null;
  email_cgp: string | null;
  
  siren: number | null;
  residence_fiscale: string | null;
  telephone: string | null;
  adresse: string | null;
  
  // RIB fields
  rib_file_path: string | null;
  rib_uploaded_at: string | null;
  rib_status: 'manquant' | 'en_attente' | 'valide';
  
  // Aggregated data
  total_investi: number;
  nb_souscriptions: number;
  projets: string[];
  tranches: string[];
  
  created_at: string;
}

// ============================================
// FETCH INVESTORS QUERY
// ============================================
const fetchInvestors = async () => {
  setLoading(true);
  
  try {
    // Main query - get investors with their CGP
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

    // Process and aggregate data
    const processedInvestors: Investor[] = investorsData.map((inv) => {
      // Calculate total invested
      const total_investi = inv.souscriptions.reduce(
        (sum, sub) => sum + (sub.montant_investi || 0), 
        0
      );

      // Get unique projects
      const projets = [
        ...new Set(
          inv.souscriptions
            .map(sub => sub.tranches?.projets?.nom_projet)
            .filter(Boolean)
        )
      ];

      // Get unique tranches
      const tranches = [
        ...new Set(
          inv.souscriptions
            .map(sub => sub.tranches?.tranche_name)
            .filter(Boolean)
        )
      ];

      return {
        id: inv.id,
        id_investisseur: inv.id_investisseur,
        nom_raison_sociale: inv.nom_raison_sociale,
        type: inv.type,
        email: inv.email,
        
        // CGP comes directly from investisseurs table
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

// ============================================
// DETAIL MODAL - CGP SECTION
// ============================================
// Replace the multiple CGPs display with single CGP
{selectedInvestor && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
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

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* CGP Section - NOW SHOWS SINGLE CGP */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-amber-600" />
            Conseiller en Gestion de Patrimoine
          </h4>
          
          {selectedInvestor.cgp ? (
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
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Aucun CGP assigné</p>
              <button
                onClick={() => {
                  setEditingInvestor(selectedInvestor);
                  setEditFormData(selectedInvestor);
                  setSelectedInvestor(null);
                }}
                className="mt-2 text-sm text-amber-600 hover:text-amber-800 font-medium"
              >
                Assigner un CGP
              </button>
            </div>
          )}
        </div>

        {/* Projects Section */}
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

        {/* Tranches Section */}
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

        {/* Rest of the details... */}
      </div>
    </div>
  </div>
)}

// ============================================
// EDIT FORM - CGP FIELDS
// ============================================
{editingInvestor && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
        <h2 className="text-2xl font-bold">Modifier l'investisseur</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Nom / Raison Sociale *
          </label>
          <input
            type="text"
            required
            value={editFormData.nom_raison_sociale}
            onChange={(e) => setEditFormData({ ...editFormData, nom_raison_sociale: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* CGP Section */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-amber-600" />
            Conseiller en Gestion de Patrimoine
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom du CGP *
              </label>
              <input
                type="text"
                required
                value={editFormData.cgp || ''}
                onChange={(e) => setEditFormData({ ...editFormData, cgp: e.target.value })}
                placeholder="Ex: Jean Dupont"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email du CGP *
              </label>
              <input
                type="email"
                required
                value={editFormData.email_cgp || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email_cgp: e.target.value })}
                placeholder="cgp@email.com"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Le CGP sera utilisé pour toutes les souscriptions de cet investisseur
          </p>
        </div>

        {/* Other fields... */}

        {/* Actions */}
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