import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrancheWizard } from './TrancheWizard';
import { PaymentWizard } from './PaymentWizard';
import { EcheancierCard } from './EcheancierCard';
import { SubscriptionsModal } from './SubscriptionsModal';
import { TranchesModal } from './TranchesModal';
import { AlertModal } from './AlertModal';
import { EcheancierModal } from './EcheancierModal';
import {
  ArrowLeft,
  Edit,
  Trash2,
  TrendingUp,
  Users,
  Layers,
  Calendar,
  Plus,
  Loader,
  X,
  AlertTriangle,
  CalendarDays,
  Coins,
  UserCircle,
  BarChart3,
} from 'lucide-react';

interface ProjectDetailProps {
  organization: { id: string; name: string; role: string };
}

interface Project {
  id: string;
  projet: string;
  emetteur: string;
  siren_emetteur: number | null;
  nom_representant: string | null;
  prenom_representant: string | null;
  email_representant: string | null;
  representant_masse: string | null;
  email_rep_masse: string | null;
  created_at: string;
  taux_nominal: number | null;
  periodicite_coupons: string | null;
  maturite_mois: number | null;
  base_interet: number | null;
  type: string | null;
}

interface Tranche {
  id: string;
  tranche_name: string;
  taux_nominal: number | null;
  periodicite_coupons: string | null;
  date_emission: string | null;
  date_echeance_finale: string | null;
  duree_mois: number | null;
}

interface Subscription {
  id: string;
  id_souscription: string;
  date_souscription: string;
  montant_investi: number;
  nombre_obligations: number;
  coupon_net: number;
  investisseur: {
    nom_raison_sociale: string;
    cgp_nom?: string;
  };
  tranche: {
    tranche_name: string;
    date_emission: string | null;
  };
  prochain_coupon?: {
    date_prochain_coupon: string;
    montant_prochain_coupon: number;
    statut: string;
  };
}

interface Payment {
  id: string;
  id_paiement: string;
  type: string;
  montant: number;
  date_paiement: string;
  statut: string;
}

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'confirm';
  onConfirm?: () => void;
}

export function ProjectDetail({ organization }: ProjectDetailProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrancheWizard, setShowTrancheWizard] = useState(false);
  const [editingTranche, setEditingTranche] = useState<Tranche | null>(null);
  const [deletingTranche, setDeletingTranche] = useState<Tranche | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [showEditSubscription, setShowEditSubscription] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [showPaymentWizard, setShowPaymentWizard] = useState(false);
  const [showEcheancierModal, setShowEcheancierModal] = useState(false);
  const [selectedTrancheForEcheancier, setSelectedTrancheForEcheancier] = useState<Tranche | null>(null);
  const [showAllTranches, setShowAllTranches] = useState(false);
  const [showSubscriptionsModal, setShowSubscriptionsModal] = useState(false);
  const [showTranchesModal, setShowTranchesModal] = useState(false);

  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const TRANCHES_LIMIT = 5;
  const SUBSCRIPTIONS_LIMIT = 5;

  const [stats, setStats] = useState({
    totalLeve: 0,
    investisseursCount: 0,
    tranchesCount: 0,
    nextCouponDate: null as string | null,
    nextCouponAmount: 0,
  });

  // ✅ FIX: useEffect avec fonction async à l'intérieur
  useEffect(() => {
    if (!projectId) return;

    const fetchProjectData = async () => {
      setLoading(true);

      try {
        // ✅ FIX: Correction de la syntaxe des requêtes Supabase
        const [projectRes, tranchesRes, subscriptionsRes, paymentsRes, prochainsCouponsRes] = await Promise.all([
          supabase.from('projets').select('*').eq('id', projectId).maybeSingle(),
          supabase.from('tranches').select('*').eq('projet_id', projectId).order('date_emission', { ascending: true }),
          // ✅ FIX: Ajout de ! pour spécifier les foreign keys
          supabase.from('souscriptions').select(`
            id, 
            id_souscription, 
            date_souscription, 
            nombre_obligations, 
            montant_investi,
            coupon_net, 
            investisseur_id,
            investisseur:investisseurs!investisseur_id(nom_raison_sociale, cgp_nom),
            tranche:tranches!tranche_id(tranche_name, date_emission)
          `).eq('projet_id', projectId).order('date_souscription', { ascending: false }),
          supabase.from('paiements').select('id, id_paiement, type, montant, date_paiement, statut').eq('projet_id', projectId).order('date_paiement', { ascending: false }),
          supabase.from('v_prochains_coupons').select('souscription_id, date_prochain_coupon, montant_prochain_coupon, statut')
        ]);

        // Gestion des erreurs
        if (projectRes.error) {
          console.error('Error fetching project:', projectRes.error);
          throw projectRes.error;
        }
        if (tranchesRes.error) {
          console.error('Error fetching tranches:', tranchesRes.error);
          throw tranchesRes.error;
        }
        if (subscriptionsRes.error) {
          console.error('Error fetching subscriptions:', subscriptionsRes.error);
          throw subscriptionsRes.error;
        }
        if (paymentsRes.error) {
          console.error('Error fetching payments:', paymentsRes.error);
        }
        if (prochainsCouponsRes.error) {
          console.error('Error fetching prochains coupons:', prochainsCouponsRes.error);
        }

        const projectData = projectRes.data;
        const tranchesData = tranchesRes.data || [];
        const subscriptionsData = subscriptionsRes.data || [];
        const paymentsData = paymentsRes.data || [];
        const prochainsCouponsData = prochainsCouponsRes.data || [];

        // Merge prochain_coupon data into subscriptions
        const subscriptionsWithCoupons = subscriptionsData.map((sub: any) => {
          const prochainCoupon = prochainsCouponsData.find((pc: any) => pc.souscription_id === sub.id);
          return {
            ...sub,
            prochain_coupon: prochainCoupon || null
          };
        });

        setProject(projectData);
        setTranches(tranchesData);
        setSubscriptions(subscriptionsWithCoupons as any);
        setPayments(paymentsData);

        // Calcul des statistiques
        if (subscriptionsWithCoupons.length > 0) {
          const totalLeve = subscriptionsWithCoupons.reduce((sum: number, sub: any) => sum + Number(sub.montant_investi || 0), 0);
          const uniqueInvestors = new Set(subscriptionsWithCoupons.map((s: any) => s.investisseur_id)).size;

          // Get next coupon from the merged data
          const upcomingCoupons = subscriptionsWithCoupons
            .filter((s: any) => s.prochain_coupon?.date_prochain_coupon)
            .sort((a: any, b: any) => 
              new Date(a.prochain_coupon.date_prochain_coupon).getTime() - 
              new Date(b.prochain_coupon.date_prochain_coupon).getTime()
            );

          const nextCoupon = upcomingCoupons[0];
          const nextCouponAmount = upcomingCoupons
            .filter((s: any) => s.prochain_coupon?.date_prochain_coupon === nextCoupon?.prochain_coupon?.date_prochain_coupon)
            .reduce((sum: number, s: any) => sum + Number(s.prochain_coupon.montant_prochain_coupon || 0), 0);

          setStats({
            totalLeve,
            investisseursCount: uniqueInvestors,
            tranchesCount: tranchesData.length,
            nextCouponDate: nextCoupon?.prochain_coupon?.date_prochain_coupon || null,
            nextCouponAmount,
          });
        } else {
          // Réinitialiser les stats si aucune souscription
          setStats({
            totalLeve: 0,
            investisseursCount: 0,
            tranchesCount: tranchesData.length,
            nextCouponDate: null,
            nextCouponAmount: 0,
          });
        }
      } catch (error) {
        console.error('Error in fetchProjectData:', error);
        setAlertState({
          isOpen: true,
          title: 'Erreur',
          message: 'Impossible de charger les données du projet',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]); // ✅ Dépendance uniquement sur projectId

  // Fonction pour recharger les données (utilisée après modifications)
  const refetchProjectData = async () => {
    if (!projectId) return;

    try {
      const [projectRes, tranchesRes, subscriptionsRes, paymentsRes, prochainsCouponsRes] = await Promise.all([
        supabase.from('projets').select('*').eq('id', projectId).maybeSingle(),
        supabase.from('tranches').select('*').eq('projet_id', projectId).order('date_emission', { ascending: true }),
        supabase.from('souscriptions').select(`
          id, 
          id_souscription, 
          date_souscription, 
          nombre_obligations, 
          montant_investi,
          coupon_net, 
          investisseur_id,
          investisseur:investisseurs!investisseur_id(nom_raison_sociale, cgp_nom),
          tranche:tranches!tranche_id(tranche_name, date_emission)
        `).eq('projet_id', projectId).order('date_souscription', { ascending: false }),
        supabase.from('paiements').select('id, id_paiement, type, montant, date_paiement, statut').eq('projet_id', projectId).order('date_paiement', { ascending: false }),
        supabase.from('v_prochains_coupons').select('souscription_id, date_prochain_coupon, montant_prochain_coupon, statut')
      ]);

      const projectData = projectRes.data;
      const tranchesData = tranchesRes.data || [];
      const subscriptionsData = subscriptionsRes.data || [];
      const paymentsData = paymentsRes.data || [];
      const prochainsCouponsData = prochainsCouponsRes.data || [];

      const subscriptionsWithCoupons = subscriptionsData.map((sub: any) => {
        const prochainCoupon = prochainsCouponsData.find((pc: any) => pc.souscription_id === sub.id);
        return {
          ...sub,
          prochain_coupon: prochainCoupon || null
        };
      });

      setProject(projectData);
      setTranches(tranchesData);
      setSubscriptions(subscriptionsWithCoupons as any);
      setPayments(paymentsData);

      if (subscriptionsWithCoupons.length > 0) {
        const totalLeve = subscriptionsWithCoupons.reduce((sum: number, sub: any) => sum + Number(sub.montant_investi || 0), 0);
        const uniqueInvestors = new Set(subscriptionsWithCoupons.map((s: any) => s.investisseur_id)).size;

        const upcomingCoupons = subscriptionsWithCoupons
          .filter((s: any) => s.prochain_coupon?.date_prochain_coupon)
          .sort((a: any, b: any) => 
            new Date(a.prochain_coupon.date_prochain_coupon).getTime() - 
            new Date(b.prochain_coupon.date_prochain_coupon).getTime()
          );

        const nextCoupon = upcomingCoupons[0];
        const nextCouponAmount = upcomingCoupons
          .filter((s: any) => s.prochain_coupon?.date_prochain_coupon === nextCoupon?.prochain_coupon?.date_prochain_coupon)
          .reduce((sum: number, s: any) => sum + Number(s.prochain_coupon.montant_prochain_coupon || 0), 0);

        setStats({
          totalLeve,
          investisseursCount: uniqueInvestors,
          tranchesCount: tranchesData.length,
          nextCouponDate: nextCoupon?.prochain_coupon?.date_prochain_coupon || null,
          nextCouponAmount,
        });
      }
    } catch (error) {
      console.error('Error refetching data:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatFrequence = (freq: string | null) => {
    if (!freq) return '-';
    const map: Record<string, string> = {
      'mensuelle': 'Mensuelle',
      'trimestrielle': 'Trimestrielle',
      'semestrielle': 'Semestrielle',
      'annuelle': 'Annuelle'
    };
    return map[freq.toLowerCase()] || freq;
  };

  const handleDeleteTranche = async (tranche: Tranche) => {
    const trancheSubscriptions = subscriptions.filter(s => s.tranche.tranche_name === tranche.tranche_name);

    let confirmMessage = `Êtes-vous sûr de vouloir supprimer la tranche "${tranche.tranche_name}" ?`;

    if (trancheSubscriptions.length > 0) {
      confirmMessage += `\n\nATTENTION : Cette tranche contient ${trancheSubscriptions.length} souscription(s) pour un montant total de ${formatCurrency(
        trancheSubscriptions.reduce((sum, s) => sum + s.montant_investi, 0)
      )}.`;
      confirmMessage += '\n\nToutes les souscriptions et échéances associées seront également supprimées.';
    }

    setAlertState({
      isOpen: true,
      title: 'Confirmer la suppression',
      message: confirmMessage,
      type: 'confirm',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('tranches').delete().eq('id', tranche.id);

          if (error) throw error;

          setAlertState({
            isOpen: true,
            title: 'Succès',
            message: 'Tranche supprimée avec succès',
            type: 'success',
          });
          refetchProjectData(); // ✅ Utilisation de refetchProjectData
        } catch (err: any) {
          console.error('Error deleting tranche:', err);
          setAlertState({
            isOpen: true,
            title: 'Erreur',
            message: 'Erreur lors de la suppression de la tranche : ' + err.message,
            type: 'error',
          });
        }
      },
    });
  };

  const handleUpdateProject = async () => {
    if (!project) return;

    const hasFinancialChanges = 
      editedProject.periodicite_coupons !== undefined && editedProject.periodicite_coupons !== project.periodicite_coupons ||
      editedProject.taux_nominal !== undefined && editedProject.taux_nominal !== project.taux_nominal ||
      editedProject.maturite_mois !== undefined && editedProject.maturite_mois !== project.maturite_mois;

    if (hasFinancialChanges && subscriptions.length > 0) {
      const confirmMsg = `ATTENTION : Vous modifiez des paramètres financiers critiques.\n\n` +
        `Cela va automatiquement :\n` +
        `• Mettre à jour toutes les tranches du projet\n` +
        `• Recalculer tous les coupons nets\n` +
        `• Régénérer toutes les échéances de paiement\n\n` +
        `${subscriptions.length} souscription(s) seront impactées.\n\n` +
        `Voulez-vous continuer ?`;

      setAlertState({
        isOpen: true,
        title: 'Modification de paramètres financiers',
        message: confirmMsg,
        type: 'confirm',
        onConfirm: async () => {
          await performProjectUpdate(hasFinancialChanges);
        },
      });
    } else {
      await performProjectUpdate(hasFinancialChanges);
    }
  };

  const performProjectUpdate = async (hasFinancialChanges: boolean) => {
    try {
      const { error } = await supabase
        .from('projets')
        .update(editedProject)
        .eq('id', project!.id);

      if (error) throw error;

      setShowEditProject(false);
      
      await refetchProjectData(); // ✅ Utilisation de refetchProjectData
      
      setAlertState({
        isOpen: true,
        title: 'Succès',
        message: 'Projet mis à jour avec succès' + (hasFinancialChanges ? '\n\nLes coupons et échéances ont été recalculés automatiquement.' : ''),
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error updating project:', err);
      setAlertState({
        isOpen: true,
        title: 'Erreur',
        message: 'Erreur lors de la mise à jour : ' + err.message,
        type: 'error',
      });
    }
  };

  const handleUpdateSubscription = async () => {
    if (!editingSubscription) return;

    try {
      const { error } = await supabase
        .from('souscriptions')
        .update({
          montant_investi: editingSubscription.montant_investi,
          nombre_obligations: editingSubscription.nombre_obligations,
          date_souscription: editingSubscription.date_souscription,
        })
        .eq('id', editingSubscription.id);

      if (error) throw error;

      setShowEditSubscription(false);
      setEditingSubscription(null);
      await refetchProjectData(); // ✅ Utilisation de refetchProjectData
      setAlertState({
        isOpen: true,
        title: 'Succès',
        message: 'Souscription mise à jour avec succès',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error updating subscription:', err);
      setAlertState({
        isOpen: true,
        title: 'Erreur',
        message: 'Erreur lors de la mise à jour : ' + err.message,
        type: 'error',
      });
    }
  };

  const handleDeleteSubscription = (sub: Subscription) => {
    setAlertState({
      isOpen: true,
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer la souscription de ${sub.investisseur.nom_raison_sociale} ?`,
      type: 'confirm',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('souscriptions')
            .delete()
            .eq('id', sub.id);

          if (error) throw error;

          setAlertState({
            isOpen: true,
            title: 'Succès',
            message: 'Souscription supprimée avec succès',
            type: 'success',
          });
          refetchProjectData(); // ✅ Utilisation de refetchProjectData
        } catch (err: any) {
          console.error('Error deleting subscription:', err);
          setAlertState({
            isOpen: true,
            title: 'Erreur',
            message: 'Erreur lors de la suppression : ' + err.message,
            type: 'error',
          });
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Projet introuvable</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 px-6 py-6">
        {/* Le reste du JSX reste identique... */}
        {/* Je ne répète pas tout le JSX pour économiser de l'espace */}
        {/* Copiez le reste de votre composant ici */}
      </div>
    </>
  );
}

export default ProjectDetail;