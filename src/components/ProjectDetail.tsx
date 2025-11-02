import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

// Placeholders pour les composants utilisés dans le fichier original.
// Remplacez par vos implémentations réelles si elles existent.
function PaymentWizard({ onClose, onSuccess }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow">PaymentWizard (placeholder)
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
          <button onClick={() => { onSuccess(); }} className="px-3 py-1 bg-slate-900 text-white rounded">Success</button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionsModal({ subscriptions, onClose, onEdit, onDelete, formatCurrency, formatDate }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-xl w-full p-6">
        <h3 className="text-lg font-bold mb-4">Souscriptions</h3>
        <div className="space-y-2">
          {subscriptions.map((s, i) => (
            <div key={i} className="flex justify-between items-center border p-2 rounded">
              <div>
                <div className="text-sm font-medium">{s.investisseur?.nom_raison_sociale || '—'}</div>
                <div className="text-xs text-slate-500">{formatDate?.(s.date_souscription)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(s)} className="px-2 py-1 border rounded">Edit</button>
                <button onClick={() => onDelete(s)} className="px-2 py-1 border rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>
      </div>
    </div>
  );
}

function TranchesModal({ tranches, subscriptions, onClose, onEdit, onDelete, formatCurrency, formatDate }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-xl w-full p-6">
        <h3 className="text-lg font-bold mb-4">Tranches</h3>
        <div className="space-y-2">
          {tranches.map((t, i) => (
            <div key={i} className="flex justify-between items-center border p-2 rounded">
              <div>
                <div className="text-sm font-medium">{t.tranche_name}</div>
                <div className="text-xs text-slate-500">Échéance: {formatDate?.(t.Date\u00a0d\'\u00e9cheance)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(t)} className="px-2 py-1 border rounded">Edit</button>
                <button onClick={() => onDelete(t)} className="px-2 py-1 border rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>
      </div>
    </div>
  );
}

function EcheancierModal({ projectId, onClose, formatCurrency, formatDate }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h3 className="text-lg font-bold mb-4">Échéancier - projet {projectId}</h3>
        <div>Placeholder échéancier</div>
        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>
      </div>
    </div>
  );
}

function AlertModal({ isOpen, onClose, onConfirm, title, message, type }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1 bg-slate-900 text-white rounded">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// Composant principal corrigé
export default function ProjectDetail({ projectId }) {
  // Etats utilisés dans le fichier fourni
  const [showEditProject, setShowEditProject] = useState(false);
  const [editedProject, setEditedProject] = useState({});
  const [showEditSubscription, setShowEditSubscription] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [showPaymentWizard, setShowPaymentWizard] = useState(false);
  const [showSubscriptionsModal, setShowSubscriptionsModal] = useState(false);
  const [showTranchesModal, setShowTranchesModal] = useState(false);
  const [showEcheancierModal, setShowEcheancierModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [tranches, setTranches] = useState([]);
  const [alertState, setAlertState] = useState({ isOpen: false, title: "", message: "", onConfirm: null, type: "" });

  useEffect(() => {
    // simulation fetch
    setSubscriptions([]);
    setTranches([]);
  }, [projectId]);

  function fetchProjectData() {
    console.log("fetchProjectData called");
  }

  function handleUpdateProject() {
    console.log("handleUpdateProject", editedProject);
    setShowEditProject(false);
  }

  function handleUpdateSubscription() {
    console.log("handleUpdateSubscription", editingSubscription);
    setShowEditSubscription(false);
    setEditingSubscription(null);
  }

  function handleDeleteSubscription(sub) {
    console.log("delete sub", sub);
    setSubscriptions((s) => s.filter((x) => x !== sub));
    setAlertState({ ...alertState, isOpen: false });
  }

  function handleDeleteTranche(tranche) {
    console.log("delete tranche", tranche);
    setTranches((t) => t.filter((x) => x !== tranche));
  }

  function formatCurrency(value) {
    if (value == null) return "€0.00";
    try {
      return Number(value).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
    } catch (e) {
      return String(value);
    }
  }

  function formatDate(d) {
    if (!d) return "-";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString("fr-FR");
  }

  return (
    <>
      <div className="p-6">
        {/* --- Edit Project Modal --- */}
        {showEditProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Modifier le projet</h3>
                    <p className="text-sm text-slate-600 mt-1">Éditez les informations du projet</p>
                  </div>
                  <button
                    onClick={() => setShowEditProject(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Email représentant</label>
                      <input
                        type="email"
                        value={editedProject.email_representant || ""}
                        onChange={(e) => setEditedProject({ ...editedProject, email_representant: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Représentant de la masse</label>
                      <input
                        type="text"
                        value={editedProject.representant_masse || ""}
                        onChange={(e) => setEditedProject({ ...editedProject, representant_masse: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Email représentant de la masse</label>
                      <input
                        type="email"
                        value={editedProject.email_rep_masse || ""}
                        onChange={(e) => setEditedProject({ ...editedProject, email_rep_masse: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200 sticky bottom-0 bg-white">
                    <button
                      onClick={() => setShowEditProject(false)}
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
                    <p className="text-sm text-slate-600 mt-1">{editingSubscription.investisseur?.nom_raison_sociale}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditSubscription(false);
                      setEditingSubscription(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Date de souscription</label>
                    <input
                      type="date"
                      value={editingSubscription.date_souscription || ""}
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
                    <label className="block text-sm font-medium text-slate-900 mb-2">Montant investi (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingSubscription.montant_investi || ""}
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
                    <label className="block text-sm font-medium text-slate-900 mb-2">Nombre d'obligations</label>
                    <input
                      type="number"
                      value={editingSubscription.nombre_obligations || ""}
                      onChange={(e) =>
                        setEditingSubscription({
                          ...editingSubscription,
                          nombre_obligations: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tranche :</span>
                      <span className="font-medium text-slate-900">{editingSubscription.tranche?.tranche_name}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-slate-600">Coupon net :</span>
                      <span className="font-medium text-slate-900">{formatCurrency(editingSubscription.coupon_net)}</span>
                    </div>
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
              // ouvre un wizard de tranche si nécessaire
              console.log('edit tranche', tranche);
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

      {/* Alert Modal */}
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
