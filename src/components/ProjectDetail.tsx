import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AlertModal } from './AlertModal';
import { PaymentWizard } from './PaymentWizard';
import { SubscriptionsModal } from './SubscriptionsModal';
import { TranchesModal } from './TranchesModal';
import { EcheancierModal } from './EcheancierModal';

function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [editedProject, setEditedProject] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [tranches, setTranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEditProject, setShowEditProject] = useState(false);
  const [showEditSubscription, setShowEditSubscription] = useState(false);
  const [showPaymentWizard, setShowPaymentWizard] = useState(false);
  const [showSubscriptionsModal, setShowSubscriptionsModal] = useState(false);
  const [showTranchesModal, setShowTranchesModal] = useState(false);
  const [showEcheancierModal, setShowEcheancierModal] = useState(false);
  const [showTrancheWizard, setShowTrancheWizard] = useState(false);

  const [editingSubscription, setEditingSubscription] = useState<any>(null);
  const [editingTranche, setEditingTranche] = useState<any>(null);

  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'error' | 'warning',
    onConfirm: () => {}
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);

      const [projectRes, tranchesRes, subscriptionsRes] = await Promise.all([
        supabase.from('projets').select('*').eq('id', projectId).single(),
        supabase.from('tranches').select('*').eq('projet_id', projectId),
        supabase.from('souscriptions').select(`
          *,
          investisseurs (
            nom_raison_sociale,
            email,
            type
          ),
          tranches (
            tranche_name
          )
        `).in('tranche_id',
          (await supabase.from('tranches').select('id').eq('projet_id', projectId)).data?.map(t => t.id) || []
        )
      ]);

      if (projectRes.error) throw projectRes.error;

      setProject(projectRes.data);
      setEditedProject(projectRes.data);
      setTranches(tranchesRes.data || []);
      setSubscriptions(subscriptionsRes.data || []);
    } catch (error) {
      console.error('Error fetching project:', error);
      setAlertState({
        isOpen: true,
        title: 'Erreur',
        message: 'Impossible de charger les données du projet',
        type: 'error',
        onConfirm: () => {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          navigate('/projets');
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const refetchProjectData = async () => {
    await fetchProjectData();
  };

  const handleUpdateProject = async () => {
    try {
      if (!editedProject?.projet?.trim()) {
        setAlertState({
          isOpen: true,
          title: 'Erreur de validation',
          message: 'Le nom du projet est requis',
          type: 'error',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
        return;
      }

      const { error } = await supabase
        .from('projets')
        .update({
          projet: editedProject.projet,
          emetteur: editedProject.emetteur,
          nom_representant: editedProject.nom_representant,
          prenom_representant: editedProject.prenom_representant,
          email_representant: editedProject.email_representant,
          representant_masse: editedProject.representant_masse,
          email_rep_masse: editedProject.email_rep_masse,
        })
        .eq('id', projectId);

      if (error) throw error;

      setProject(editedProject);
      setShowEditProject(false);

      setAlertState({
        isOpen: true,
        title: 'Succès',
        message: 'Projet mis à jour avec succès',
        type: 'success',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    } catch (error) {
      console.error('Error updating project:', error);
      setAlertState({
        isOpen: true,
        title: 'Erreur',
        message: 'Impossible de mettre à jour le projet',
        type: 'error',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const handleUpdateSubscription = async () => {
    if (!editingSubscription) return;

    try {
      if (!editingSubscription.montant_investi || editingSubscription.montant_investi <= 0) {
        setAlertState({
          isOpen: true,
          title: 'Erreur de validation',
          message: 'Le montant investi doit être supérieur à 0',
          type: 'error',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
        return;
      }

      const { error } = await supabase
        .from('souscriptions')
        .update({
          date_souscription: editingSubscription.date_souscription,
          montant_investi: editingSubscription.montant_investi,
          nombre_obligations: editingSubscription.nombre_obligations,
        })
        .eq('id', editingSubscription.id);

      if (error) throw error;

      setSubscriptions(prev =>
        prev.map(sub => sub.id === editingSubscription.id ? editingSubscription : sub)
      );

      setShowEditSubscription(false);
      setEditingSubscription(null);

      setAlertState({
        isOpen: true,
        title: 'Succès',
        message: 'Souscription mise à jour avec succès',
        type: 'success',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });

      refetchProjectData();
    } catch (error) {
      console.error('Error updating subscription:', error);
      setAlertState({
        isOpen: true,
        title: 'Erreur',
        message: 'Impossible de mettre à jour la souscription',
        type: 'error',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    setAlertState({
      isOpen: true,
      title: 'Confirmer la suppression',
      message: 'Êtes-vous sûr de vouloir supprimer cette souscription ?',
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('souscriptions')
            .delete()
            .eq('id', subscriptionId);

          if (error) throw error;

          setSubscriptions(prev => prev.filter(sub => sub.id !== subscriptionId));

          setAlertState({
            isOpen: true,
            title: 'Succès',
            message: 'Souscription supprimée avec succès',
            type: 'success',
            onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
          });

          refetchProjectData();
        } catch (error) {
          console.error('Error deleting subscription:', error);
          setAlertState({
            isOpen: true,
            title: 'Erreur',
            message: 'Impossible de supprimer la souscription',
            type: 'error',
            onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
          });
        }
      }
    });
  };

  const handleDeleteTranche = async (trancheId: string) => {
    setAlertState({
      isOpen: true,
      title: 'Confirmer la suppression',
      message: 'Êtes-vous sûr de vouloir supprimer cette tranche ?',
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('tranches')
            .delete()
            .eq('id', trancheId);

          if (error) throw error;

          setTranches(prev => prev.filter(t => t.id !== trancheId));

          setAlertState({
            isOpen: true,
            title: 'Succès',
            message: 'Tranche supprimée avec succès',
            type: 'success',
            onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
          });

          refetchProjectData();
        } catch (error) {
          console.error('Error deleting tranche:', error);
          setAlertState({
            isOpen: true,
            title: 'Erreur',
            message: 'Impossible de supprimer la tranche',
            type: 'error',
            onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
          });
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Chargement...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-slate-600 mb-4">Projet non trouvé</div>
          <button
            onClick={() => navigate('/projets')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour aux projets
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-8 py-8">
        <button
          onClick={() => navigate('/projets')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux projets
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {project.projet}
            </h1>
            <p className="text-slate-600">{project.emetteur}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Tranches</p>
              <p className="text-2xl font-bold text-slate-900">{tranches.length}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Souscriptions</p>
              <p className="text-2xl font-bold text-slate-900">{subscriptions.length}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Total levé</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(subscriptions.reduce((sum, sub) => sum + (sub.montant_investi || 0), 0))}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Investisseurs</p>
              <p className="text-2xl font-bold text-slate-900">
                {new Set(subscriptions.map(s => s.investisseur_id)).size}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowEditProject(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Modifier le projet
            </button>
            <button
              onClick={() => setShowSubscriptionsModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Voir les souscriptions
            </button>
            <button
              onClick={() => setShowTranchesModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Voir les tranches
            </button>
            <button
              onClick={() => setShowEcheancierModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Échéancier
            </button>
          </div>
        </div>

        {showEditProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Modifier le Projet</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Mettez à jour les informations du projet
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditProject(false);
                      setEditedProject(project);
                    }}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-4">
                      Informations générales
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Nom du projet *
                        </label>
                        <input
                          type="text"
                          value={editedProject?.projet || ''}
                          onChange={(e) =>
                            setEditedProject({ ...editedProject, projet: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Émetteur
                        </label>
                        <input
                          type="text"
                          value={editedProject?.emetteur || ''}
                          onChange={(e) =>
                            setEditedProject({ ...editedProject, emetteur: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Prénom représentant
                        </label>
                        <input
                          type="text"
                          value={editedProject?.prenom_representant || ''}
                          onChange={(e) =>
                            setEditedProject({ ...editedProject, prenom_representant: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Nom représentant
                        </label>
                        <input
                          type="text"
                          value={editedProject?.nom_representant || ''}
                          onChange={(e) =>
                            setEditedProject({ ...editedProject, nom_representant: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Email représentant
                        </label>
                        <input
                          type="email"
                          value={editedProject?.email_representant || ''}
                          onChange={(e) =>
                            setEditedProject({ ...editedProject, email_representant: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Représentant de la masse
                        </label>
                        <input
                          type="text"
                          value={editedProject?.representant_masse || ''}
                          onChange={(e) =>
                            setEditedProject({ ...editedProject, representant_masse: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Email représentant de la masse
                        </label>
                        <input
                          type="email"
                          value={editedProject?.email_rep_masse || ''}
                          onChange={(e) =>
                            setEditedProject({ ...editedProject, email_rep_masse: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-slate-200 bg-white">
                <button
                  onClick={() => {
                    setShowEditProject(false);
                    setEditedProject(project);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateProject}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditSubscription && editingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Modifier la Souscription</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {editingSubscription.investisseurs?.nom_raison_sociale || 'Investisseur'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditSubscription(false);
                      setEditingSubscription(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Date de souscription
                    </label>
                    <input
                      type="date"
                      value={editingSubscription.date_souscription || ''}
                      onChange={(e) =>
                        setEditingSubscription({
                          ...editingSubscription,
                          date_souscription: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Montant investi (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingSubscription.montant_investi || ''}
                      onChange={(e) =>
                        setEditingSubscription({
                          ...editingSubscription,
                          montant_investi: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Nombre d'obligations
                    </label>
                    <input
                      type="number"
                      value={editingSubscription.nombre_obligations || ''}
                      onChange={(e) =>
                        setEditingSubscription({
                          ...editingSubscription,
                          nombre_obligations: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditSubscription(false);
                      setEditingSubscription(null);
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleUpdateSubscription}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPaymentWizard && (
          <PaymentWizard
            onClose={() => setShowPaymentWizard(false)}
            onSuccess={() => {
              setShowPaymentWizard(false);
              refetchProjectData();
            }}
          />
        )}

        {showSubscriptionsModal && (
          <SubscriptionsModal
            subscriptions={subscriptions}
            onClose={() => setShowSubscriptionsModal(false)}
            onEdit={(sub) => {
              setEditingSubscription(sub);
              setShowEditSubscription(true);
            }}
            onDelete={handleDeleteSubscription}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {showTranchesModal && (
          <TranchesModal
            tranches={tranches}
            subscriptions={subscriptions}
            onClose={() => setShowTranchesModal(false)}
            onEdit={(tranche) => {
              setEditingTranche(tranche);
              setShowTrancheWizard(true);
            }}
            onDelete={handleDeleteTranche}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {showEcheancierModal && (
          <EcheancierModal
            projectId={projectId}
            onClose={() => setShowEcheancierModal(false)}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}
      </div>

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
        onConfirm={alertState.onConfirm}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />
    </>
  );
}

export default ProjectDetail;
