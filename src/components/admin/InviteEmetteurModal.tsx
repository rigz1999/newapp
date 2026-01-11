import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../utils/toast';
import { Spinner } from '../common/Spinner';

interface InviteEmetteurModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteEmetteurModal({
  projectId,
  projectName,
  onClose,
  onSuccess,
}: InviteEmetteurModalProps) {
  const { user } = useAuth();
  const [projectOrgId, setProjectOrgId] = useState<string | null>(null);
  const [projectOrgName, setProjectOrgName] = useState<string>('');
  const [availableEmetteurs, setAvailableEmetteurs] = useState<string[]>([]);
  const [selectedEmetteur, setSelectedEmetteur] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customEmetteurName, setCustomEmetteurName] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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

      if (error) throw error;

      setProjectOrgId(data.org_id);
      setProjectOrgName((data.organizations as any)?.name || '');
    } catch (error: any) {
      console.error('Error loading project organization:', error);
      toast.error('Erreur lors du chargement du projet');
    }
  };

  const loadAvailableEmetteurs = async () => {
    try {
      setLoadingEmetteurs(true);
      const { data, error } = await supabase.rpc('get_org_emetteurs', {
        p_org_id: projectOrgId!,
      });

      if (error) throw error;
      setAvailableEmetteurs(data.map((item: any) => item.emetteur_name) || []);
    } catch (error: any) {
      console.error('Error loading emetteurs:', error);
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

      const { data, error } = await supabase.functions.invoke('invite-emetteur', {
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

      if (error) throw error;

      toast.success('Invitation envoyée avec succès');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error inviting emetteur:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Inviter un émetteur</h2>
            <p className="text-sm text-gray-500 mt-1">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Émetteur
            </label>
            {loadingEmetteurs ? (
              <div className="flex justify-center py-2">
                <Spinner size="sm" />
              </div>
            ) : (
              <>
                {!isCustom && availableEmetteurs.length > 0 && (
                  <select
                    value={selectedEmetteur}
                    onChange={(e) => {
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
                    {availableEmetteurs.map((emetteur) => (
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
                      onChange={(e) => setCustomEmetteurName(e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2">
            {projectOrgName && (
              <p className="text-sm text-blue-900 font-medium">
                Organisation : {projectOrgName}
              </p>
            )}
            <p className="text-sm text-blue-800">
              L'émetteur recevra un email pour activer son accès et pourra consulter le calendrier de paiement et les actualités du projet.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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
    </div>
  );
}
