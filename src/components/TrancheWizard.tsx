import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { FileUpload } from './FileUpload';

interface Project {
  id: string;
  projet: string;
}

interface TrancheWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedProjectId?: string;
}

interface ParsedSubscription {
  investor_type: string;
  investisseur_nom: string;
  prenom_rep_legal?: string;
  nom_rep_legal?: string;
  nom_jeune_fille?: string;
  raison_sociale?: string;
  siren?: string;
  adresse_siege?: string;
  email_rep_legal: string;
  telephone?: string;
  residence_fiscale?: string;
  date_souscription: string;
  quantite: string;
  montant: string;
  departement_naissance?: string;
}

export function TrancheWizard({ onClose, onSuccess, preselectedProjectId }: TrancheWizardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [trancheName, setTrancheName] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ParsedSubscription[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (preselectedProjectId) {
      setSelectedProjectId(preselectedProjectId);
    }
  }, [preselectedProjectId]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projets')
      .select('id, projet')
      .order('created_at', { ascending: false });

    setProjects(data || []);
    setLoading(false);
  };

  const getSuggestedTrancheName = async (projectId: string) => {
    const { data: project } = await supabase
      .from('projets')
      .select('projet')
      .eq('id', projectId)
      .single();

    const { data, count } = await supabase
      .from('tranches')
      .select('id', { count: 'exact', head: true })
      .eq('projet_id', projectId);

    const trancheNumber = (count || 0) + 1;
    const projectName = project?.projet || '';
    return `${projectName} - T${trancheNumber}`;
  };

  const handleProjectSelect = async (projectId: string) => {
    setSelectedProjectId(projectId);
    const suggested = await getSuggestedTrancheName(projectId);
    setSuggestedName(suggested);
    setTrancheName(suggested);
  };

  const normalizeColumnName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');
  };

  const mapColumnName = (normalized: string): string => {
    const mappings: { [key: string]: string } = {
      'investor_type': 'investor_type',
      'type_investisseur': 'investor_type',
      'investisseur_nom': 'investisseur_nom',
      'nom_investisseur': 'investisseur_nom',
      'prenom_du_representant_legal': 'prenom_rep_legal',
      'prenom_rep_legal': 'prenom_rep_legal',
      'nom_du_representant_legal': 'nom_rep_legal',
      'nom_rep_legal': 'nom_rep_legal',
      'nom_de_jeune_fille_du_representant_legal': 'nom_jeune_fille',
      'nom_jeune_fille': 'nom_jeune_fille',
      'raison_sociale': 'raison_sociale',
      'n_siren': 'siren',
      'siren': 'siren',
      'adresse_du_siege_social': 'adresse_siege',
      'adresse_siege': 'adresse_siege',
      'email_du_representant_legal': 'email_rep_legal',
      'email_rep_legal': 'email_rep_legal',
      'telephone': 'telephone',
      'residence_fiscale_1_du_representant_legal': 'residence_fiscale',
      'residence_fiscale': 'residence_fiscale',
      'date_de_souscription': 'date_souscription',
      'date_souscription': 'date_souscription',
      'quantite': 'quantite',
      'montant': 'montant',
      'departement_de_naissance': 'departement_naissance',
      'departement_naissance': 'departement_naissance',
    };

    return mappings[normalized] || normalized;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Veuillez sélectionner un fichier CSV');
      return;
    }

    setCsvFile(file);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      setError('Le fichier CSV est vide ou invalide');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const normalizedHeaders = headers.map(h => mapColumnName(normalizeColumnName(h)));

    const rows: ParsedSubscription[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};

      normalizedHeaders.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      if (row['investisseur_nom'] || row['raison_sociale']) {
        rows.push({
          investor_type: row['investor_type'] || 'physique',
          investisseur_nom: row['investisseur_nom'] || '',
          prenom_rep_legal: row['prenom_rep_legal'] || '',
          nom_rep_legal: row['nom_rep_legal'] || '',
          nom_jeune_fille: row['nom_jeune_fille'] || '',
          raison_sociale: row['raison_sociale'] || '',
          siren: row['siren'] || '',
          adresse_siege: row['adresse_siege'] || '',
          email_rep_legal: row['email_rep_legal'] || '',
          telephone: row['telephone'] || '',
          residence_fiscale: row['residence_fiscale'] || '',
          date_souscription: row['date_souscription'] || '',
          quantite: row['quantite'] || '0',
          montant: row['montant'] || '0',
          departement_naissance: row['departement_naissance'] || '',
        });
      }
    }

    if (rows.length === 0) {
      setError('Aucune donnée valide trouvée dans le fichier CSV');
      return;
    }

    setCsvData(rows);
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
      const day = dateStr.substring(0, 2);
      const month = dateStr.substring(2, 4);
      const year = dateStr.substring(4, 8);
      return `${year}-${month}-${day}`;
    }

    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return dateStr;
      }
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    return new Date().toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (!selectedProjectId) {
      setError('Veuillez sélectionner un projet');
      return;
    }
    if (!trancheName.trim()) {
      setError('Veuillez entrer un nom de tranche');
      return;
    }
    if (!csvFile || csvData.length === 0) {
      setError('Veuillez charger un fichier CSV valide');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const { data: trancheData, error: trancheError } = await supabase
        .from('tranches')
        .insert({
          projet_id: selectedProjectId,
          tranche_name: trancheName,
          frequence: '6',
          taux_interet: '10',
          maturite_mois: 24,
        })
        .select()
        .single();

      if (trancheError) throw trancheError;

      let successCount = 0;

      for (const row of csvData) {
        try {
          const investorName = row.investor_type === 'morale'
            ? (row.raison_sociale || 'Société Inconnue')
            : (row.investisseur_nom || `${row.prenom_rep_legal || ''} ${row.nom_rep_legal || ''}`.trim() || 'Investisseur Inconnu');

          const { data: existingInvestor } = await supabase
            .from('investisseurs')
            .select('id')
            .eq('id_investisseur', `INV-${row.email_rep_legal || Math.random()}`)
            .maybeSingle();

          let investorId: string;

          if (existingInvestor) {
            investorId = existingInvestor.id;
          } else {
            const sirenValue = row.siren ? parseInt(row.siren.replace(/\D/g, '')) : null;
            const telephoneValue = row.telephone ? parseInt(row.telephone.replace(/\D/g, '')) : null;
            const deptValue = row.departement_naissance ? parseInt(row.departement_naissance) : null;

            const { data: newInvestor, error: investorError } = await supabase
              .from('investisseurs')
              .insert({
                id_investisseur: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: row.investor_type,
                nom_raison_sociale: investorName,
                representant_legal: row.investor_type === 'morale'
                  ? `${row.prenom_rep_legal || ''} ${row.nom_rep_legal || ''}`.trim() || null
                  : null,
                siren: sirenValue,
                email: row.email_rep_legal || null,
                telephone: telephoneValue,
                adresse: row.adresse_siege || null,
                residence_fiscale: row.residence_fiscale || null,
                departement_naissance: deptValue,
              })
              .select()
              .single();

            if (investorError) throw investorError;
            investorId = newInvestor.id;
          }

          const montantValue = parseFloat(row.montant.replace(/[^\d.-]/g, '')) || 0;
          const quantiteValue = parseInt(row.quantite.replace(/\D/g, '')) || 0;

          const { error: subscriptionError } = await supabase
            .from('souscriptions')
            .insert({
              id_souscription: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              projet_id: selectedProjectId,
              tranche_id: trancheData.id,
              investisseur_id: investorId,
              date_souscription: formatDate(row.date_souscription),
              nombre_obligations: quantiteValue,
              montant_investi: montantValue,
              coupon_brut: 0,
              coupon_net: 0,
            });

          if (subscriptionError) throw subscriptionError;
          successCount++;
        } catch (err) {
          console.error('Error processing row:', err);
        }
      }

      if (successCount === 0) {
        throw new Error('Aucune souscription n\'a pu être créée');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-slate-200 flex justify-between items-center rounded-t-2xl">
          <h3 className="text-xl font-bold text-slate-900">Nouvelle Tranche</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Projet
            </label>
            {loading ? (
              <div className="text-center py-4">
                <Loader className="w-6 h-6 animate-spin mx-auto text-slate-400" />
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Sélectionnez un projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projet}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Nom de la tranche
            </label>
            {suggestedName && (
              <p className="text-sm text-slate-600 mb-2">
                Nom suggéré: <span className="font-medium">{suggestedName}</span>
              </p>
            )}
            <input
              type="text"
              value={trancheName}
              onChange={(e) => setTrancheName(e.target.value)}
              placeholder="Ex: T1, Tranche A..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Fichier CSV des souscriptions
            </label>
            <FileUpload
              accept=".csv"
              onFileSelect={(files) => {
                if (files && files.length > 0) {
                  handleFileSelect({ target: { files } } as any);
                }
              }}
              label="Sélectionner un fichier CSV"
              description="Glissez-déposez votre fichier CSV ici ou cliquez pour sélectionner"
            />
            {csvFile && (
              <div className="mt-4 text-center">
                <div className="text-sm text-slate-600 flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {csvFile.name}
                </div>
                {csvData.length > 0 && (
                  <div className="mt-2 text-sm font-semibold text-green-600">
                    {csvData.length} souscription{csvData.length > 1 ? 's' : ''} détectée{csvData.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
              <p className="font-semibold mb-2">Colonnes attendues (noms flexibles):</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Type investisseur (physique/morale)</li>
                <li>Nom investisseur ou Raison sociale</li>
                <li>Email du représentant légal</li>
                <li>Date de souscription</li>
                <li>Quantité (nombre d'obligations)</li>
                <li>Montant</li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white p-6 border-t border-slate-200 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            disabled={processing}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing || !selectedProjectId || !trancheName || csvData.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Création en cours...
              </>
            ) : (
              csvData.length > 0
                ? `Créer avec ${csvData.length} souscription${csvData.length > 1 ? 's' : ''}`
                : 'Créer la tranche'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
