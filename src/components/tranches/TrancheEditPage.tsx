import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, AlertCircle, Loader, Edit, Edit2, Lock, ExternalLink, RefreshCw } from 'lucide-react';
import { logger } from '../../utils/logger';

interface Tranche {
  id: string;
  tranche_name: string;
  projet_id: string;
  date_emission?: string | null;
}

interface Souscription {
  id: string;
  investisseur_id: string;
  investisseur_nom: string;
  investisseur_type: string;
  montant_investi: number;
  nombre_obligations: number;
}

interface InvestorDetails {
  id: string;
  nom_raison_sociale: string;
  type: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  investments: InvestmentSummary[];
  total_investments: number;
}

interface InvestmentSummary {
  tranche_id: string;
  tranche_name: string;
  projet_name: string;
  montant_investi: number;
  nombre_obligations: number;
}

interface TrancheEditPageProps {
  tranche: Tranche;
  onClose: () => void;
  onSuccess: () => void;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);

export function TrancheEditPage({
  tranche,
  onClose,
  onSuccess,
}: TrancheEditPageProps): JSX.Element {
  const [trancheName, setTrancheName] = useState(tranche.tranche_name);
  const [dateEmission, setDateEmission] = useState(tranche.date_emission || '');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  // Inherited fields from project
  const [tauxNominal, setTauxNominal] = useState<string>('');
  const [dureeMois, setDureeMois] = useState<string>('');
  const [periodiciteCoupons, setPeriodiciteCoupons] = useState<string>('');

  // Subscriptions
  const [souscriptions, setSouscriptions] = useState<Souscription[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [loadingSouscriptions, setLoadingSouscriptions] = useState(false);

  // Investor details modal
  const [selectedInvestorDetails, setSelectedInvestorDetails] = useState<InvestorDetails | null>(
    null
  );

  // Reassignment
  const [reassigningSouscriptionId, setReassigningSouscriptionId] = useState<string | null>(null);
  const [availableInvestors, setAvailableInvestors] = useState<
    Array<{ id: string; nom_raison_sociale: string; type: string }>
  >([]);
  const [searchInvestorQuery, setSearchInvestorQuery] = useState('');

  useEffect(() => {
    fetchProjectData();
    fetchSouscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProjectData = async (): Promise<void> => {
    try {
      const { data: project } = await supabase
        .from('projets')
        .select('taux_nominal, periodicite_coupons, duree_mois')
        .eq('id', tranche.projet_id)
        .single();

      if (project) {
        if (project.taux_nominal) {
          setTauxNominal(project.taux_nominal.toString());
        }
        if (project.periodicite_coupons) {
          setPeriodiciteCoupons(project.periodicite_coupons);
        }
        if (project.duree_mois) {
          setDureeMois(project.duree_mois.toString());
        }
      }
    } catch (err) {
      logger.error(new Error('Erreur lors du chargement des données du projet'), { error: err });
    }
  };

  const fetchSouscriptions = async (): Promise<void> => {
    setLoadingSouscriptions(true);
    try {
      const { data, error } = await supabase
        .from('souscriptions')
        .select(
          `
          id,
          investisseur_id,
          montant_investi,
          nombre_obligations,
          investisseurs (
            *
          )
        `
        )
        .eq('tranche_id', tranche.id)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const formattedSouscriptions =
        data?.map(
          (s: {
            id: string;
            investisseur_id: string;
            montant_investi: number;
            nombre_obligations: number;
            investisseurs: { nom_raison_sociale?: string; type?: string } | null;
          }) => {
            const inv = s.investisseurs || {};
            const nom = inv.nom_raison_sociale || 'Nom manquant';

            return {
              id: s.id,
              investisseur_id: s.investisseur_id,
              investisseur_nom: nom,
              investisseur_type: inv.type || 'physique',
              montant_investi: s.montant_investi,
              nombre_obligations: s.nombre_obligations,
            };
          }
        ) || [];

      setSouscriptions(formattedSouscriptions);
    } catch (err) {
      logger.error(new Error('Erreur lors du chargement des souscriptions'), { error: err });
      setError('Impossible de charger les souscriptions');
    } finally {
      setLoadingSouscriptions(false);
    }
  };

  const fetchInvestorDetails = async (investorId: string): Promise<void> => {
    try {
      const { data: investor, error: investorError } = await supabase
        .from('investisseurs')
        .select('id, nom_raison_sociale, type, email, telephone, adresse')
        .eq('id', investorId)
        .single();

      if (investorError) {
        throw investorError;
      }

      const { data: investments, error: investmentsError } = await supabase
        .from('souscriptions')
        .select(
          `
          montant_investi,
          nombre_obligations,
          tranches!inner (
            id,
            tranche_name,
            projets!inner (
              projet
            )
          )
        `
        )
        .eq('investisseur_id', investorId);

      if (investmentsError) {
        throw investmentsError;
      }

      const investmentsSummary: InvestmentSummary[] = (investments || []).map(
        (inv: {
          montant_investi: number;
          nombre_obligations: number;
          tranches: {
            id: string;
            tranche_name: string;
            projets: { projet: string };
          };
        }) => ({
          tranche_id: inv.tranches.id,
          tranche_name: inv.tranches.tranche_name,
          projet_name: inv.tranches.projets.projet,
          montant_investi: inv.montant_investi,
          nombre_obligations: inv.nombre_obligations,
        })
      );

      setSelectedInvestorDetails({
        id: investor.id,
        nom_raison_sociale: investor.nom_raison_sociale || '',
        type: investor.type || 'physique',
        email: investor.email || '',
        telephone: investor.telephone || '',
        adresse: investor.adresse || '',
        investments: investmentsSummary,
        total_investments: investmentsSummary.length,
      });
    } catch (err) {
      logger.error(new Error("Erreur lors du chargement des détails de l'investisseur"), {
        error: err,
      });
      setError("Impossible de charger les détails de l'investisseur");
    }
  };

  const fetchAvailableInvestors = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('investisseurs')
        .select('id, nom_raison_sociale, type')
        .order('nom_raison_sociale', { ascending: true })
        .limit(100);

      if (error) {
        throw error;
      }
      setAvailableInvestors(data || []);
    } catch (err) {
      logger.error(new Error('Erreur lors du chargement des investisseurs'), { error: err });
    }
  };

  const handleReassignSouscription = async (
    souscriptionId: string,
    newInvestorId: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('souscriptions')
        .update({ investisseur_id: newInvestorId })
        .eq('id', souscriptionId);

      if (error) {
        throw error;
      }

      logger.info('Souscription réassignée', { souscriptionId, newInvestorId });
      await fetchSouscriptions();
      setReassigningSouscriptionId(null);
      setSearchInvestorQuery('');
    } catch (err) {
      logger.error(new Error('Erreur lors de la réassignation de la souscription'), { error: err });
      setError('Impossible de réassigner la souscription');
    }
  };

  const handleSouscriptionEdit = (
    index: number,
    field: 'montant_investi' | 'nombre_obligations',
    value: number
  ): void => {
    const updated = [...souscriptions];
    updated[index] = { ...updated[index], [field]: value };
    setSouscriptions(updated);
  };

  const saveSouscriptionEdit = async (index: number): Promise<void> => {
    const souscription = souscriptions[index];
    try {
      const { error } = await supabase
        .from('souscriptions')
        .update({
          montant_investi: souscription.montant_investi,
          nombre_obligations: souscription.nombre_obligations,
        })
        .eq('id', souscription.id);

      if (error) {
        throw error;
      }
      logger.info('Souscription mise à jour', { id: souscription.id });
      setEditingRow(null);
    } catch (err) {
      logger.error(new Error('Erreur lors de la mise à jour de la souscription'), { error: err });
      setError('Impossible de mettre à jour la souscription');
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!trancheName) {
      setError('Le nom de la tranche est requis');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('tranches')
        .update({
          tranche_name: trancheName,
          date_emission: dateEmission || null,
        } as never)
        .eq('id', tranche.id);

      if (updateError) {
        throw updateError;
      }

      logger.info('Tranche mise à jour', { id: tranche.id });
      onSuccess();
      onClose();
    } catch (err) {
      logger.error(new Error('Erreur lors de la mise à jour de la tranche'), { error: err });
      setError('Impossible de mettre à jour la tranche');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 overflow-y-auto">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              disabled={processing}
            >
              <X className="w-6 h-6" />
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <Edit className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Modifier la tranche</h1>
              <p className="text-sm text-slate-600 mt-0.5">{trancheName || 'Sans nom'}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 font-medium"
              disabled={processing}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={processing || !trancheName}
              className="px-5 py-2.5 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {processing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                'Mettre à jour'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Erreur</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Left Column - Basic Info */}
          <div className="xl:col-span-1 space-y-6">
            {/* Tranche Name Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Informations de base</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom de la tranche <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={trancheName}
                    onChange={e => setTrancheName(e.target.value)}
                    disabled={processing}
                    placeholder="Ex: T1, Tranche A..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date d'émission
                  </label>
                  <input
                    type="date"
                    value={dateEmission}
                    onChange={e => setDateEmission(e.target.value)}
                    disabled={processing}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Inherited Fields Card */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Paramètres hérités du projet
                </h3>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Ces valeurs sont héritées du projet et ne peuvent pas être modifiées
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1.5">Taux Nominal</p>
                  <p className="text-lg font-bold text-slate-900">
                    {tauxNominal ? `${tauxNominal}%` : 'Non défini'}
                  </p>
                </div>
                <div className="h-px bg-slate-200" />
                <div>
                  <p className="text-xs text-slate-600 mb-1.5">Durée</p>
                  <p className="text-lg font-bold text-slate-900">
                    {dureeMois ? `${dureeMois} mois` : 'Non défini'}
                  </p>
                </div>
                <div className="h-px bg-slate-200" />
                <div>
                  <p className="text-xs text-slate-600 mb-1.5">Périodicité</p>
                  <p className="text-lg font-bold text-slate-900">
                    {periodiciteCoupons || 'Non défini'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Subscriptions */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Edit2 className="w-5 h-5" />
                      Souscriptions ({souscriptions.length})
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                      Cliquez sur une ligne pour modifier le <strong>montant</strong> ou le{' '}
                      <strong>nombre d'obligations</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-8">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        Gestion des données maître
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Les informations investisseur (nom, type) sont des données maître. Pour les
                        modifier, utilisez la gestion des investisseurs ou réassignez la
                        souscription à un autre investisseur.
                      </p>
                    </div>
                  </div>
                </div>

                {loadingSouscriptions ? (
                  <div className="p-12 text-center">
                    <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
                    <p className="text-sm text-slate-600">Chargement des souscriptions...</p>
                  </div>
                ) : souscriptions.length === 0 ? (
                  <div className="p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-900 mb-1">
                      Aucune souscription trouvée
                    </p>
                    <p className="text-sm text-slate-600">
                      Cette tranche ne contient aucune souscription
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5" />
                                Investisseur
                              </div>
                            </th>
                            <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5" />
                                Type
                              </div>
                            </th>
                            <th className="px-8 py-5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              <div className="flex items-center justify-end gap-2">
                                <Edit2 className="w-3.5 h-3.5" />
                                Montant
                              </div>
                            </th>
                            <th className="px-8 py-5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              <div className="flex items-center justify-end gap-2">
                                <Edit2 className="w-3.5 h-3.5" />
                                Titres
                              </div>
                            </th>
                            <th className="px-8 py-5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {souscriptions.map((souscription, index) => (
                            <tr
                              key={souscription.id}
                              className={`transition-colors ${editingRow === index ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                            >
                              <td className="px-8 py-5 text-sm whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  <button
                                    onClick={() =>
                                      fetchInvestorDetails(souscription.investisseur_id)
                                    }
                                    className="font-medium text-slate-900 hover:text-blue-600 flex items-center gap-1.5 transition-colors group"
                                    title="Voir les détails de l'investisseur"
                                  >
                                    <span>{souscription.investisseur_nom}</span>
                                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-sm whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                      souscription.investisseur_type === 'physique'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}
                                  >
                                    {souscription.investisseur_type === 'physique'
                                      ? 'Physique'
                                      : 'Morale'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-sm text-right whitespace-nowrap">
                                {editingRow === index ? (
                                  <input
                                    type="number"
                                    value={souscription.montant_investi}
                                    onChange={e =>
                                      handleSouscriptionEdit(
                                        index,
                                        'montant_investi',
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    disabled={processing}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-medium"
                                  />
                                ) : (
                                  <button
                                    onClick={() => setEditingRow(index)}
                                    disabled={processing}
                                    className="text-left w-full hover:text-blue-600 font-semibold text-slate-900 transition-colors"
                                  >
                                    {formatCurrency(souscription.montant_investi)}
                                  </button>
                                )}
                              </td>
                              <td className="px-8 py-5 text-sm text-right whitespace-nowrap">
                                {editingRow === index ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <input
                                      type="number"
                                      value={souscription.nombre_obligations}
                                      onChange={e =>
                                        handleSouscriptionEdit(
                                          index,
                                          'nombre_obligations',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      disabled={processing}
                                      className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-medium"
                                    />
                                    <button
                                      onClick={() => saveSouscriptionEdit(index)}
                                      disabled={processing}
                                      className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors font-medium whitespace-nowrap"
                                    >
                                      ✓ Enregistrer
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-700 font-medium">
                                    {souscription.nombre_obligations}
                                  </span>
                                )}
                              </td>
                              <td className="px-8 py-5 text-sm text-center whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setReassigningSouscriptionId(souscription.id);
                                    fetchAvailableInvestors();
                                  }}
                                  disabled={processing}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                                  title="Réassigner à un autre investisseur"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Réassigner
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investor Details Modal */}
      {selectedInvestorDetails && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">Détails de l'investisseur</h3>
                    <p className="text-purple-100 text-sm">
                      {selectedInvestorDetails.total_investments} investissement(s)
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedInvestorDetails(null)}
                    className="text-white hover:text-purple-200 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Informations</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Nom / Raison sociale</p>
                      <p className="font-semibold text-slate-900">
                        {selectedInvestorDetails.nom_raison_sociale}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Type</p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedInvestorDetails.type === 'physique'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {selectedInvestorDetails.type === 'physique' ? 'Physique' : 'Morale'}
                      </span>
                    </div>
                    {selectedInvestorDetails.email && (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Email</p>
                        <p className="text-sm text-slate-900">{selectedInvestorDetails.email}</p>
                      </div>
                    )}
                    {selectedInvestorDetails.telephone && (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Téléphone</p>
                        <p className="text-sm text-slate-900">
                          {selectedInvestorDetails.telephone}
                        </p>
                      </div>
                    )}
                    {selectedInvestorDetails.adresse && (
                      <div className="col-span-2">
                        <p className="text-sm text-slate-600 mb-1">Adresse</p>
                        <p className="text-sm text-slate-900">{selectedInvestorDetails.adresse}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200">
                  <div className="p-5 border-b border-slate-200">
                    <h4 className="text-lg font-semibold text-slate-900">
                      Tous les investissements ({selectedInvestorDetails.total_investments})
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Projet
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Tranche
                          </th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                            Montant
                          </th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                            Titres
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedInvestorDetails.investments.map((inv, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-sm text-slate-900">{inv.projet_name}</td>
                            <td className="px-5 py-3 text-sm text-slate-900">{inv.tranche_name}</td>
                            <td className="px-5 py-3 text-sm text-right font-medium">
                              {formatCurrency(inv.montant_investi)}
                            </td>
                            <td className="px-5 py-3 text-sm text-right text-slate-600">
                              {inv.nombre_obligations}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 bg-white p-6 border-t border-slate-200">
                <button
                  onClick={() => setSelectedInvestorDetails(null)}
                  className="w-full px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Subscription Modal */}
      {reassigningSouscriptionId && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">Réassigner la souscription</h3>
                    <p className="text-blue-100 text-sm">Sélectionnez un nouvel investisseur</p>
                  </div>
                  <button
                    onClick={() => {
                      setReassigningSouscriptionId(null);
                      setSearchInvestorQuery('');
                    }}
                    className="text-white hover:text-blue-200 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rechercher un investisseur
                  </label>
                  <input
                    type="text"
                    value={searchInvestorQuery}
                    onChange={e => setSearchInvestorQuery(e.target.value)}
                    placeholder="Nom ou raison sociale..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                  {availableInvestors
                    .filter(inv =>
                      inv.nom_raison_sociale
                        .toLowerCase()
                        .includes(searchInvestorQuery.toLowerCase())
                    )
                    .map(investor => (
                      <button
                        key={investor.id}
                        onClick={() =>
                          handleReassignSouscription(reassigningSouscriptionId, investor.id)
                        }
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">
                              {investor.nom_raison_sociale}
                            </p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                                investor.type === 'physique'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {investor.type === 'physique' ? 'Physique' : 'Morale'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div className="p-6 border-t border-slate-200">
                <button
                  onClick={() => {
                    setReassigningSouscriptionId(null);
                    setSearchInvestorQuery('');
                  }}
                  className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
