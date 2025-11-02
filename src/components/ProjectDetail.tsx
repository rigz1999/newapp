import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

// ⚠️ FIX: Import nommé au lieu de default pour AlertModal
import { AlertModal } from './AlertModal';

// Imports des autres composants
import PaymentWizard from './PaymentWizard';
import SubscriptionsModal from './SubscriptionsModal';
import TranchesModal from './TranchesModal';
import EcheancierModal from './EcheancierModal';

function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // États
  const [project, setProject] = useState(null);
  const [editedProject, setEditedProject] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [tranches, setTranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États des modales
  const [showEditProject, setShowEditProject] = useState(false);
  const [showEditSubscription, setShowEditSubscription] = useState(false);
  const [showPaymentWizard, setShowPaymentWizard] = useState(false);
  const [showSubscriptionsModal, setShowSubscriptionsModal] = useState(false);
  const [showTranchesModal, setShowTranchesModal] = useState(false);
  const [showEcheancierModal, setShowEcheancierModal] = useState(false);
  const [showTrancheWizard, setShowTrancheWizard] = useState(false);
  
  // États d'édition
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [editingTranche, setEditingTranche] = useState(null);
  
  // État des alertes
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {}
  });

  // Fonctions utilitaires
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  // Fonction pour récupérer les données du projet
  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Erreur réseau');
      
      const data = await response.json();
      
      setProject(data.project);
      setEditedProject(data.project);
      setSubscriptions(data.subscriptions || []);
      setTranches(data.tranches || []);
    } catch (error) {
      console.error('Erreur lors du chargement du projet:', error);
      setAlertState({
        isOpen: true,
        title: 'Erreur',
        message: 'Impossible de charger les données du projet',
        type: 'error',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fonction pour mettre à jour le projet
  const handleUpdateProject = async () => {
    try {
      if (!editedProject.nom_projet?.trim()) {
        setAlertState({
          isOpen: true,
          title: 'Erreur de validation',
          message: 'Le nom du projet est requis',
          type: 'error',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
        return;
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedProject)
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour');

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
      console.error('Erreur:', error);
      setAlertState({
        isOpen: true,
        title: 'Erreur',
        message: 'Impossible de mettre à jour le projet',
        type: 'error',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  // Fonction pour mettre à jour une souscription
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

      const response = await fetch(`/api/subscriptions/${editingSubscription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSubscription)
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour');

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
    } catch (error) {
      console.error('Erreur:', error);
      setAlertState({
        isOpen: true,
        title: 'Erreur',
        message: 'Impossible de mettre à jour la souscription',
        type: 'error',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  // Fonction pour supprimer une souscription
  const handleDeleteSubscription = async (subscriptionId) => {
    setAlertState({
      isOpen: true,
      title: 'Confirmer la suppression',
      message: 'Êtes-vous sûr de vouloir supprimer cette souscription ?',
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
            method: 'DELETE'
          });

          if (!response.ok) throw new Error('Erreur lors de la suppression');

          setSubscriptions(prev => prev.filter(sub => sub.id !== subscriptionId));
          
          setAlertState({
            isOpen: true,
            title: 'Succès',
            message: 'Souscription supprimée avec succès',
            type: 'success',
            onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
          });
        } catch (error) {
          console.error('Erreur:', error);
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

  // Fonction pour supprimer une tranche
  const handleDeleteTranche = async (trancheId) => {
    setAlertState({
      isOpen: true,
      title: 'Confirmer la suppression',
      message: 'Êtes-vous sûr de vouloir supprimer cette tranche ?',
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/tranches/${trancheId}`, {
            method: 'DELETE'
          });

          if (!response.ok) throw new Error('Erreur lors de la suppression');

          setTranches(prev => prev.filter(t => t.id !== trancheId));
          
          setAlertState({
            isOpen: true,
            title: 'Succès',
            message: 'Tranche supprimée avec succès',
            type: 'success',
            onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
          });
        } catch (error) {
          console.error('Erreur:', error);
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

  // Charger les données au montage
  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

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
        <div className="text-slate-600">Projet non trouvé</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-6">
        {/* Contenu principal */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            {project.nom_projet}
          </h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowEditProject(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Modifier le projet
            </button>
            <button
              onClick={() => setShowSubscriptionsModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Voir les souscriptions
            </button>
            <button
              onClick={() => setShowTranchesModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Voir les tranches
            </button>
          </div>
        </div>
        
        {/* Edit Project Modal */}
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
                          value={editedProject?.nom_projet || ''}
                          onChange={(e) =>
                            setEditedProject({ ...editedProject, nom_projet: e.target.value })
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
                          Représentant
                        </label>
                        <input
                          type="text"
                          value={editedProject?.representant || ''}
                          onChange={(e) =>
                            setEditedProject({ ...editedProject, representant: e.target.value })
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
                  className="flex-1 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Subscription Modal */}
        {showEditSubscription && editingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Modifier la Souscription</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {editingSubscription.investisseur?.nom_raison_sociale || 'Investisseur'}
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

                  {editingSubscription.tranche && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Tranche :</span>
                        <span className="font-medium text-slate-900">
                          {editingSubscription.tranche.tranche_name || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-slate-600">Coupon net :</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(editingSubscription.coupon_net)}
                        </span>
                      </div>
                    </div>
                  )}
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
                    className="flex-1 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Wizard Modal */}
        {showPaymentWizard && (
          <PaymentWizard
            onClose={() => setShowPaymentWizard(false)}
            onSuccess={() => {
              setShowPaymentWizard(false);
              fetchProjectData();
            }}
          />
        )}

        {/* Subscriptions Modal */}
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

        {/* Tranches Modal */}
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

        {/* Echeancier Modal */}
        {showEcheancierModal && (
          <EcheancierModal
            projectId={projectId}
            onClose={() => setShowEcheancierModal(false)}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}
      </div>

      {/* Alert Modal - Import nommé */}
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