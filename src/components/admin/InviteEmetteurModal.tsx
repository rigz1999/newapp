import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

import { toast } from '../../utils/toast';
import { Spinner } from '../common/Spinner';
import { logger } from '../../utils/logger';

interface InviteEmetteurModalProps {
  projectId: string;
  projectName: string;
  projectEmetteur?: string;
  projectEmail?: string;
  projectFirstName?: string;
  projectLastName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProjectOrganization {
  org_id: string | null;
  organizations: {
    name: string;
  } | null;
}

interface EmetteurData {
  emetteur_name: string;
}

export default function InviteEmetteurModal({
  projectId,
  projectName,
  projectEmetteur,
  projectEmail,
  projectFirstName,
  projectLastName,
  onClose,
  onSuccess,
}: InviteEmetteurModalProps) {
  const [projectOrgId, setProjectOrgId] = useState<string | null>(null);
  const [projectOrgName, setProjectOrgName] = useState<string>('');
  const [availableEmetteurs, setAvailableEmetteurs] = useState<string[]>([]);
  const [selectedEmetteur, setSelectedEmetteur] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customEmetteurName, setCustomEmetteurName] = useState('');
  const [email, setEmail] = useState(projectEmail || '');
  const [firstName, setFirstName] = useState(projectFirstName || '');
  const [lastName, setLastName] = useState(projectLastName || '');
  const [loading, setLoading] = useState(false);
  const [loadingEmetteurs, setLoadingEmetteurs] = useState(true);

  useEffect(() => {
    loadProjectOrganization();
  }, [projectId]);

  useEffect(() => {
    if (projectOrgId) {
      loadAvailableEmetteurs();
    }
  }, [projectOrgId]);

  const loadProjectOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('projets')
        .select('org_id, organizations(name)')
        .eq('id', projectId)
        .single();

      if (error) {
        throw error;
      }

      const projectData = data as unknown as ProjectOrganization;
      setProjectOrgId(projectData.org_id);
      setProjectOrgName(projectData.organizations?.name || '');
    } catch (error) {
      logger.error('Error loading project organization', error as Record<string, unknown>);
      toast.error('Erreur lors du chargement du projet');
    }
  };

  const loadAvailableEmetteurs = async () => {
    try {
      setLoadingEmetteurs(true);
      const { data, error } = await supabase.rpc('get_org_emetteurs', {
        p_org_id: projectOrgId!,
      });

      if (error) {
        throw error;
      }
      const emetteursData = (data || []) as EmetteurData[];
      const emetteurs = emetteursData.map(item => item.emetteur_name);
      setAvailableEmetteurs(emetteurs);

      if (projectEmetteur && emetteurs.includes(projectEmetteur)) {
        setSelectedEmetteur(projectEmetteur);
      }
    } catch (error) {
      logger.error('Error loading emetteurs', error as Record<string, unknown>);
      toast.error('Erreur lors du chargement des émetteurs');
    } finally {
      setLoadingEmetteurs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emetteurName = isCustom ? customEmetteurName : selectedEmetteur;

    if (!emetteurName || !email || !firstName || !lastName) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (!projectOrgId) {
      toast.error('Organisation du projet non trouvée');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.functions.invoke('invite-emetteur', {
        body: {
          email,
          firstName,
          lastName,
          emetteurName,
          projetId: projectId,
          projetName: projectName,
          orgId: projectOrgId,
          orgName: projectOrgName,
        },
      });

      if (error) {
        throw error;
      }

      toast.success('Invitation envoyée avec succès');
      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Error inviting emetteur', error as Record<string, unknown>);
      const errorMessage =
        error instanceof Error ? error.message : "Erreur lors de l'envoi de l'invitation";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Inviter un émetteur</h2>
            <p className="text-sm text-gray-500 mt-1">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer la modal"
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Émetteur</label>
              {loadingEmetteurs ? (
                <div className="flex justify-center py-2">
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
                  {!isCustom && availableEmetteurs.length > 0 && (
                    <select
                      value={selectedEmetteur}
                      onChange={e => {
                        if (e.target.value === '__custom__') {
                          setIsCustom(true);
                          setSelectedEmetteur('');
                        } else {
                          setSelectedEmetteur(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={!isCustom}
                    >
                      <option value="">Sélectionnez un émetteur</option>
                      {availableEmetteurs.map(emetteur => (
                        <option key={emetteur} value={emetteur}>
                          {emetteur}
                        </option>
                      ))}
                      <option value="__custom__">➕ Autre émetteur...</option>
                    </select>
                  )}

                  {(isCustom || availableEmetteurs.length === 0) && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customEmetteurName}
                        onChange={e => setCustomEmetteurName(e.target.value)}
                        placeholder="Nom de l'émetteur"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      {availableEmetteurs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustom(false);
                            setCustomEmetteurName('');
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          ← Choisir depuis la liste
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                L'émetteur recevra un e-mail pour activer son accès et pourra consulter le calendrier
                de paiement et les actualités du projet.
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading && <Spinner size="sm" />}
              Envoyer l'invitation
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
