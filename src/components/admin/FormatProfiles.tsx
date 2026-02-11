// Gestion des profils de format par organisation
// Upload du fichier client → extraction headers → auto-mapping → review → save
// Accessible uniquement aux super admins

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileSpreadsheet,
  Plus,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Loader2,
  Upload,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Layers,
  FolderOpen,
  Info,
  RotateCcw,
} from 'lucide-react';
import { TableSkeleton } from '../common/Skeleton';
import { AlertModal, ConfirmModal } from '../common/Modals';
import { logger } from '../../utils/logger';
import { toast } from '../../utils/toast';
import { logAuditEvent } from '../../utils/auditLogger';
import {
  extractExcelHeaders,
  autoMapFields,
  DEFAULT_FIELD_ALIASES,
} from '../../utils/projectImportParser';

// =============================================================================
// TYPES
// =============================================================================

interface FormatProfile {
  id: string;
  company_id: string | null;
  profile_name: string;
  is_standard: boolean;
  is_active: boolean;
  version: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  format_config: FormatConfig;
  organizations?: { name: string };
}

interface FormatConfig {
  file_type?: string;
  accepted_extensions?: string[];
  structure?: {
    type: string;
    section_markers?: { physical: string; moral: string };
    encoding?: string;
    fallback_encoding?: string;
  };
  column_mappings?: {
    physical: Record<string, string>;
    moral: Record<string, string>;
  };
  data_transformations?: {
    date_format?: string;
    date_format_alternative?: string;
    decimal_separator?: string;
    phone_format?: string;
    skip_rows_with?: string[];
  };
  validation_rules?: Record<string, unknown>;
  project_import?: {
    column_mappings?: Record<string, string>;
    field_aliases?: Record<string, string[]>;
  };
}

interface Organization {
  id: string;
  name: string;
}

type MappingTarget = 'projet' | 'tranche';
type WizardStep = 'choose' | 'upload' | 'map' | 'done';

// =============================================================================
// CONSTANTS — target fields for each mapping type
// =============================================================================

const PROJECT_FIELDS: { key: string; label: string; required: boolean }[] = [
  { key: 'projet', label: 'Nom du projet', required: true },
  { key: 'taux_interet', label: "Taux d'intérêt (%)", required: true },
  { key: 'montant_global_eur', label: 'Montant global (EUR)', required: true },
  { key: 'maturite_mois', label: 'Maturité (mois)', required: true },
  { key: 'periodicite_coupon', label: 'Périodicité du coupon', required: true },
  { key: 'emetteur', label: "Nom de l'émetteur", required: false },
  { key: 'siren_emetteur', label: 'SIREN émetteur', required: false },
  { key: 'date_emission', label: "Date d'émission", required: false },
  { key: 'valeur_nominale', label: 'Valeur nominale', required: false },
  { key: 'type', label: "Type d'obligation", required: false },
  { key: 'base_interet', label: "Base d'intérêt", required: false },
  { key: 'nom_representant', label: 'Nom du représentant', required: false },
  { key: 'prenom_representant', label: 'Prénom du représentant', required: false },
  { key: 'email_representant', label: 'Email du représentant', required: false },
  { key: 'representant_masse', label: 'Représentant de la masse', required: false },
  { key: 'email_rep_masse', label: 'Email rep. masse', required: false },
  { key: 'telephone_rep_masse', label: 'Tél. rep. masse', required: false },
  { key: 'apply_flat_tax', label: 'Appliquer PFU (Oui/Non)', required: false },
];

const TRANCHE_FIELDS_PHYSICAL: { key: string; label: string; required: boolean }[] = [
  { key: 'Quantité', label: 'Quantité', required: true },
  { key: 'Montant', label: 'Montant', required: true },
  { key: 'Nom(s)', label: 'Nom(s)', required: true },
  { key: 'Prénom(s)', label: 'Prénom(s)', required: true },
  { key: 'E-mail', label: 'E-mail', required: true },
  { key: 'Téléphone', label: 'Téléphone', required: false },
  { key: 'Né(e) le', label: 'Date de naissance', required: false },
  { key: 'Lieu de naissance', label: 'Lieu de naissance', required: false },
  { key: 'Département de naissance', label: 'Dépt. naissance', required: false },
  { key: 'Adresse du domicile', label: 'Adresse', required: false },
  { key: 'Résidence Fiscale 1', label: 'Résidence fiscale', required: false },
  { key: 'PPE', label: 'PPE', required: false },
  { key: 'Catégorisation', label: 'Catégorisation', required: false },
  { key: 'Date de Transfert', label: 'Date de transfert', required: false },
  { key: 'Date de Validation BS', label: 'Date validation BS', required: false },
  { key: 'PEA / PEA-PME', label: 'PEA / PEA-PME', required: false },
  { key: 'Numéro de Compte PEA / PEA-PME', label: 'N° compte PEA', required: false },
  { key: 'CGP', label: 'CGP', required: false },
  { key: 'E-mail du CGP', label: 'E-mail CGP', required: false },
  { key: 'Code du CGP', label: 'Code CGP', required: false },
  { key: 'Siren du CGP', label: 'SIREN CGP', required: false },
];

const TRANCHE_FIELDS_MORAL: { key: string; label: string; required: boolean }[] = [
  { key: 'Quantité', label: 'Quantité', required: true },
  { key: 'Montant', label: 'Montant', required: true },
  { key: 'Raison sociale', label: 'Raison sociale', required: true },
  { key: 'N° SIREN', label: 'N° SIREN', required: true },
  { key: 'E-mail du représentant légal', label: 'E-mail rep. légal', required: true },
  { key: 'Prénom du représentant légal', label: 'Prénom rep. légal', required: false },
  { key: 'Nom du représentant légal', label: 'Nom rep. légal', required: false },
  { key: 'Téléphone', label: 'Téléphone', required: false },
  { key: 'Adresse du siège social', label: 'Adresse siège', required: false },
  {
    key: 'Résidence Fiscale 1 du représentant légal',
    label: 'Résidence fiscale rep.',
    required: false,
  },
  {
    key: 'Département de naissance du représentant',
    label: 'Dépt. naissance rep.',
    required: false,
  },
  { key: 'PPE', label: 'PPE', required: false },
  { key: 'Catégorisation', label: 'Catégorisation', required: false },
  { key: 'Date de Transfert', label: 'Date de transfert', required: false },
  { key: 'Date de Validation BS', label: 'Date validation BS', required: false },
  { key: 'PEA / PEA-PME', label: 'PEA / PEA-PME', required: false },
  { key: 'Numéro de Compte PEA / PEA-PME', label: 'N° compte PEA', required: false },
  { key: 'CGP', label: 'CGP', required: false },
  { key: 'E-mail du CGP', label: 'E-mail CGP', required: false },
  { key: 'Code du CGP', label: 'Code CGP', required: false },
  { key: 'Siren du CGP', label: 'SIREN CGP', required: false },
];

// Aliases for auto-mapping tranche fields (the keys are the same as the field names)
function getTrancheAliases(fields: { key: string }[]): { key: string; aliases: string[] }[] {
  return fields.map(f => ({ key: f.key, aliases: [f.key] }));
}

function getProjectAliases(): { key: string; aliases: string[] }[] {
  return PROJECT_FIELDS.map(f => ({
    key: f.key,
    aliases: (DEFAULT_FIELD_ALIASES as Record<string, string[]>)[f.key] || [f.label],
  }));
}

// =============================================================================
// MAPPING DROPDOWN TABLE
// =============================================================================

function MappingDropdownTable({
  fields,
  clientHeaders,
  mappings,
  onChange,
  sectionLabel,
}: {
  fields: { key: string; label: string; required: boolean }[];
  clientHeaders: string[];
  mappings: Record<string, string>;
  onChange: (fieldKey: string, clientCol: string) => void;
  sectionLabel?: string;
}) {
  const mappedCount = Object.values(mappings).filter(v => v).length;

  return (
    <div>
      {sectionLabel && (
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-700">{sectionLabel}</h4>
          <span className="text-xs text-slate-500">
            {mappedCount}/{fields.length} mappé(s)
          </span>
        </div>
      )}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_24px_1fr] bg-slate-50 border-b border-slate-200">
          <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase">Notre champ</div>
          <div />
          <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase">
            Colonne du fichier client
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
          {fields.map(field => {
            const selected = mappings[field.key] || '';
            return (
              <div
                key={field.key}
                className={`grid grid-cols-[1fr_24px_1fr] items-center ${
                  selected ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                <div className="px-3 py-2">
                  <span className="text-sm text-slate-800">{field.label}</span>
                  {field.required && <span className="text-finixar-red ml-0.5">*</span>}
                </div>
                <div className="flex justify-center">
                  <ChevronRight
                    className={`w-4 h-4 ${selected ? 'text-emerald-500' : 'text-slate-300'}`}
                  />
                </div>
                <div className="px-2 py-1.5">
                  <select
                    value={selected}
                    onChange={e => onChange(field.key, e.target.value)}
                    className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none bg-no-repeat bg-right pr-8 ${
                      selected
                        ? 'border-emerald-300 bg-emerald-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      backgroundSize: '16px',
                      backgroundPosition: 'right 8px center',
                    }}
                  >
                    <option value="">— Non mappé —</option>
                    {clientHeaders.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FormatProfiles(): JSX.Element {
  const [profiles, setProfiles] = useState<FormatProfile[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // View modal
  const [viewProfile, setViewProfile] = useState<FormatProfile | null>(null);

  // Delete confirm
  const [deletingProfile, setDeletingProfile] = useState<FormatProfile | null>(null);

  // Alert
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  // ── Wizard state ──
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('choose');
  const [editingProfile, setEditingProfile] = useState<FormatProfile | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [profileName, setProfileName] = useState('');
  const [mappingTarget, setMappingTarget] = useState<MappingTarget>('projet');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [clientHeaders, setClientHeaders] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState('');
  // Mappings: fieldKey → clientColumnName (or '')
  const [projectMappings, setProjectMappings] = useState<Record<string, string>>({});
  const [tranchePhysicalMappings, setTranchePhysicalMappings] = useState<Record<string, string>>(
    {}
  );
  const [trancheMoralMappings, setTrancheMoralMappings] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showAlert = useCallback(
    (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      setAlertConfig({ title, message, type });
      setShowAlertModal(true);
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [profilesRes, orgsRes] = await Promise.all([
        supabase
          .from('company_format_profiles')
          .select('*, organizations(name)')
          .order('is_standard', { ascending: false })
          .order('profile_name', { ascending: true }),
        supabase.from('organizations').select('id, name').order('name'),
      ]);

      if (profilesRes.error) {
        throw profilesRes.error;
      }
      if (orgsRes.error) {
        throw orgsRes.error;
      }

      setProfiles((profilesRes.data || []) as unknown as FormatProfile[]);
      setOrganizations(orgsRes.data || []);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('Erreur chargement données:', error);
      showAlert('Erreur', msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ─────────────────────────────────────────────────────────────────────
  // WIZARD ACTIONS
  // ─────────────────────────────────────────────────────────────────────

  function resetWizard() {
    setWizardStep('choose');
    setEditingProfile(null);
    setSelectedOrgId('');
    setProfileName('');
    setMappingTarget('projet');
    setUploadedFile(null);
    setExtracting(false);
    setClientHeaders([]);
    setSheetName('');
    setProjectMappings({});
    setTranchePhysicalMappings({});
    setTrancheMoralMappings({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function openWizardCreate() {
    resetWizard();
    setShowWizard(true);
  }

  function openWizardEdit(profile: FormatProfile) {
    resetWizard();
    setEditingProfile(profile);
    setSelectedOrgId(profile.company_id || '');
    setProfileName(profile.profile_name);

    // Determine which mapping type to show based on existing config
    const config = profile.format_config;
    if (
      config.project_import?.column_mappings &&
      Object.keys(config.project_import.column_mappings).length > 0
    ) {
      setMappingTarget('projet');
    } else {
      setMappingTarget('tranche');
    }

    setShowWizard(true);
  }

  async function handleFileUpload(file: File) {
    setUploadedFile(file);
    setExtracting(true);

    try {
      const result = await extractExcelHeaders(file);
      setClientHeaders(result.headers);
      setSheetName(result.sheetName);

      // Auto-map using fuzzy matching
      if (mappingTarget === 'projet') {
        const autoMapped = autoMapFields(getProjectAliases(), result.headers);
        setProjectMappings(autoMapped);
      } else {
        const autoPhysical = autoMapFields(
          getTrancheAliases(TRANCHE_FIELDS_PHYSICAL),
          result.headers
        );
        const autoMoral = autoMapFields(getTrancheAliases(TRANCHE_FIELDS_MORAL), result.headers);
        setTranchePhysicalMappings(autoPhysical);
        setTrancheMoralMappings(autoMoral);
      }

      const mappedCount =
        mappingTarget === 'projet'
          ? Object.values(autoMapFields(getProjectAliases(), result.headers)).filter(v => v).length
          : Object.values(
              autoMapFields(getTrancheAliases(TRANCHE_FIELDS_PHYSICAL), result.headers)
            ).filter(v => v).length;

      toast.success(
        `${result.headers.length} colonnes détectées, ${mappedCount} champ(s) auto-mappé(s)`
      );

      setWizardStep('map');
    } catch (err) {
      logger.error('Erreur extraction headers:', err as Record<string, unknown>);
      toast.error(
        "Erreur lors de la lecture du fichier. Vérifiez qu'il s'agit d'un fichier Excel valide."
      );
      setUploadedFile(null);
    } finally {
      setExtracting(false);
    }
  }

  function handleResetAutoMap() {
    if (clientHeaders.length === 0) {
      return;
    }

    if (mappingTarget === 'projet') {
      setProjectMappings(autoMapFields(getProjectAliases(), clientHeaders));
    } else {
      setTranchePhysicalMappings(
        autoMapFields(getTrancheAliases(TRANCHE_FIELDS_PHYSICAL), clientHeaders)
      );
      setTrancheMoralMappings(
        autoMapFields(getTrancheAliases(TRANCHE_FIELDS_MORAL), clientHeaders)
      );
    }
    toast.success('Auto-mapping réinitialisé');
  }

  async function handleSave() {
    if (!editingProfile && !selectedOrgId) {
      toast.error('Veuillez sélectionner une organisation');
      setWizardStep('choose');
      return;
    }
    if (!profileName.trim()) {
      toast.error('Le nom du profil est obligatoire');
      setWizardStep('choose');
      return;
    }

    setSaving(true);
    try {
      // Build format_config
      const existingConfig = editingProfile?.format_config || {};
      const newConfig: FormatConfig = {
        ...existingConfig,
        file_type: 'excel',
        accepted_extensions: ['.xlsx', '.xls', '.csv'],
      };

      if (mappingTarget === 'projet') {
        // Save project mappings (only non-empty ones)
        const cleanMappings: Record<string, string> = {};
        for (const [key, val] of Object.entries(projectMappings)) {
          if (val) {
            cleanMappings[key] = val;
          }
        }
        newConfig.project_import = {
          ...newConfig.project_import,
          column_mappings: cleanMappings,
        };
      } else {
        // Save tranche mappings (revert: { clientCol: standardCol })
        const physicalRevert: Record<string, string> = {};
        for (const [standardCol, clientCol] of Object.entries(tranchePhysicalMappings)) {
          if (clientCol) {
            physicalRevert[clientCol] = standardCol;
          }
        }
        const moralRevert: Record<string, string> = {};
        for (const [standardCol, clientCol] of Object.entries(trancheMoralMappings)) {
          if (clientCol) {
            moralRevert[clientCol] = standardCol;
          }
        }
        newConfig.column_mappings = {
          physical: physicalRevert,
          moral: moralRevert,
        };
        newConfig.structure = existingConfig.structure || {
          type: 'two_sections',
          section_markers: { physical: 'Personnes Physiques', moral: 'Personnes Morales' },
          encoding: 'utf-8',
          fallback_encoding: 'windows-1252',
        };
        newConfig.data_transformations = existingConfig.data_transformations || {
          date_format: 'dd/mm/yyyy',
          date_format_alternative: 'yyyy-mm-dd',
          decimal_separator: ',',
          phone_format: 'international',
          skip_rows_with: ['TOTAL', 'SOUS-TOTAL', 'Total', 'Sous-total'],
        };
        newConfig.validation_rules = existingConfig.validation_rules || {
          required_fields_physical: ['Quantité', 'Montant', 'Nom(s)', 'Prénom(s)', 'E-mail'],
          required_fields_moral: [
            'Quantité',
            'Montant',
            'Raison sociale',
            'N° SIREN',
            'E-mail du représentant légal',
          ],
          email_validation: true,
          siren_length: 9,
          phone_validation: true,
        };
      }

      if (editingProfile) {
        const { error } = await supabase
          .from('company_format_profiles')
          .update({
            profile_name: profileName.trim(),
            format_config: newConfig,
          })
          .eq('id', editingProfile.id);

        if (error) {
          throw error;
        }

        logAuditEvent({
          action: 'updated',
          entityType: 'format_profile',
          entityId: editingProfile.id,
          description: `Profil "${profileName}" mis à jour (${mappingTarget})`,
        });
        toast.success('Profil mis à jour');
      } else {
        const { error } = await supabase.from('company_format_profiles').insert({
          profile_name: profileName.trim(),
          company_id: selectedOrgId,
          is_standard: false,
          is_active: true,
          format_config: newConfig,
        });

        if (error) {
          throw error;
        }

        logAuditEvent({
          action: 'created',
          entityType: 'format_profile',
          entityId: '',
          description: `Profil "${profileName}" créé (${mappingTarget})`,
        });
        toast.success('Profil créé');
      }

      setShowWizard(false);
      resetWizard();
      await fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('Erreur sauvegarde:', error);
      if (msg.includes('idx_unique_active_company_profile')) {
        toast.error("Cette organisation a déjà un profil actif. Désactivez-le d'abord.");
      } else {
        toast.error(`Erreur: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingProfile) {
      return;
    }
    try {
      const { error } = await supabase
        .from('company_format_profiles')
        .delete()
        .eq('id', deletingProfile.id);
      if (error) {
        throw error;
      }

      logAuditEvent({
        action: 'deleted',
        entityType: 'format_profile',
        entityId: deletingProfile.id,
        description: `Profil "${deletingProfile.profile_name}" supprimé`,
      });
      toast.success('Profil supprimé');
      setDeletingProfile(null);
      await fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('Erreur suppression:', error);
      toast.error(`Erreur: ${msg}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // WIZARD STEP VALIDATION
  // ─────────────────────────────────────────────────────────────────────

  const canProceedFromChoose = (editingProfile || selectedOrgId) && profileName.trim();
  const mappedCount =
    mappingTarget === 'projet'
      ? Object.values(projectMappings).filter(v => v).length
      : Object.values(tranchePhysicalMappings).filter(v => v).length +
        Object.values(trancheMoralMappings).filter(v => v).length;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Profils de Format</h1>
              <p className="text-slate-600">
                Configurez les correspondances de colonnes par société
              </p>
            </div>
          </div>
          <button
            onClick={openWizardCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau Profil
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Total Profils</p>
            <p className="text-2xl font-bold text-slate-900">{profiles.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Profils Actifs</p>
            <p className="text-2xl font-bold text-finixar-green">
              {profiles.filter(p => p.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Profils Personnalisés</p>
            <p className="text-2xl font-bold text-purple-600">
              {profiles.filter(p => !p.is_standard).length}
            </p>
          </div>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Profil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Société
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Mappings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-600">Aucun profil de format</p>
                  </td>
                </tr>
              ) : (
                profiles.map(profile => {
                  const config = profile.format_config;
                  const registreCount =
                    Object.keys(config.column_mappings?.physical || {}).length +
                    Object.keys(config.column_mappings?.moral || {}).length;
                  const projectCount = Object.keys(
                    config.project_import?.column_mappings || {}
                  ).length;

                  return (
                    <tr key={profile.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${profile.is_standard ? 'bg-blue-100' : 'bg-purple-100'}`}
                          >
                            <FileSpreadsheet
                              className={`w-5 h-5 ${profile.is_standard ? 'text-blue-600' : 'text-purple-600'}`}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{profile.profile_name}</p>
                            {profile.description && (
                              <p className="text-xs text-slate-500 max-w-[200px] truncate">
                                {profile.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {profile.is_standard ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Standard
                          </span>
                        ) : profile.organizations ? (
                          <span className="text-sm text-slate-900">
                            {profile.organizations.name}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1.5">
                          {registreCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Layers className="w-3 h-3 mr-1" />
                              Tranche {registreCount}
                            </span>
                          )}
                          {projectCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                              <FolderOpen className="w-3 h-3 mr-1" />
                              Projet {projectCount}
                            </span>
                          )}
                          {registreCount === 0 && projectCount === 0 && (
                            <span className="text-xs text-slate-400">Aucun</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {profile.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            Inactif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        v{profile.version}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewProfile(profile)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Voir"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openWizardEdit(profile)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!profile.is_standard && (
                            <button
                              onClick={() => setDeletingProfile(profile)}
                              className="p-2 text-finixar-red hover:bg-red-50 rounded-lg"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════ WIZARD MODAL ═══════════════════════════ */}
      {showWizard && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => !saving && !extracting && setShowWizard(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
              {/* Wizard Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingProfile ? 'Modifier le profil' : 'Nouveau profil'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {(['choose', 'upload', 'map'] as WizardStep[]).map((step, i) => {
                      const labels = ['Configuration', 'Fichier', 'Mapping'];
                      const isCurrent = wizardStep === step;
                      const isPast =
                        (wizardStep === 'upload' && step === 'choose') ||
                        (wizardStep === 'map' && (step === 'choose' || step === 'upload'));
                      return (
                        <div key={step} className="flex items-center gap-2">
                          {i > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                          <span
                            className={`text-xs font-medium ${
                              isCurrent
                                ? 'text-blue-600'
                                : isPast
                                  ? 'text-emerald-600'
                                  : 'text-slate-400'
                            }`}
                          >
                            {labels[i]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowWizard(false);
                    resetWizard();
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Wizard Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* ──── STEP 1: CHOOSE ──── */}
                {wizardStep === 'choose' && (
                  <div className="space-y-6 max-w-lg mx-auto">
                    {!editingProfile && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Organisation <span className="text-finixar-red">*</span>
                        </label>
                        <select
                          value={selectedOrgId}
                          onChange={e => setSelectedOrgId(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Sélectionner une organisation</option>
                          {organizations.map(org => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nom du profil <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={e => setProfileName(e.target.value)}
                        placeholder="Ex: Format SocGen Projets"
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">
                        Que souhaitez-vous mapper ?
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setMappingTarget('projet')}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            mappingTarget === 'projet'
                              ? 'border-violet-500 bg-violet-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <FolderOpen
                            className={`w-6 h-6 mb-2 ${mappingTarget === 'projet' ? 'text-violet-600' : 'text-slate-400'}`}
                          />
                          <p className="font-medium text-slate-900">Création de projet</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Mapper les colonnes du fichier aux champs du formulaire de création
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMappingTarget('tranche')}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            mappingTarget === 'tranche'
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Layers
                            className={`w-6 h-6 mb-2 ${mappingTarget === 'tranche' ? 'text-emerald-600' : 'text-slate-400'}`}
                          />
                          <p className="font-medium text-slate-900">Import de tranche</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Mapper les colonnes du registre (pers. physiques et morales)
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ──── STEP 2: UPLOAD ──── */}
                {wizardStep === 'upload' && (
                  <div className="max-w-lg mx-auto">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Uploadez le fichier Excel du client
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Les colonnes seront extraites automatiquement et pré-mappées
                      </p>
                    </div>

                    <div
                      onClick={() => !extracting && fileInputRef.current?.click()}
                      onDragOver={e => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                          handleFileUpload(file);
                        } else {
                          toast.error('Format non supporté. Utilisez .xlsx ou .xls');
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                        extracting
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file);
                          }
                        }}
                      />
                      {extracting ? (
                        <>
                          <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
                          <p className="text-sm font-medium text-blue-700">
                            Extraction des colonnes...
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                          <p className="text-sm font-medium text-slate-700">
                            Glissez votre fichier ici ou cliquez pour sélectionner
                          </p>
                          <p className="text-xs text-slate-500 mt-2">
                            Formats acceptés : .xlsx, .xls
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ──── STEP 3: MAP ──── */}
                {wizardStep === 'map' && (
                  <div className="space-y-4">
                    {/* File info + actions bar */}
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{uploadedFile?.name}</p>
                          <p className="text-xs text-slate-500">
                            Feuille "{sheetName}" &middot; {clientHeaders.length} colonnes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleResetAutoMap}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                          title="Relancer l'auto-mapping"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Re-mapper
                        </button>
                        <button
                          onClick={() => {
                            setUploadedFile(null);
                            setClientHeaders([]);
                            setWizardStep('upload');
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Changer de fichier
                        </button>
                      </div>
                    </div>

                    {/* Info banner */}
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-800">
                        Les colonnes ont été pré-mappées automatiquement. Vérifiez et corrigez si
                        nécessaire. Les champs non mappés seront laissés vides lors de l'import.
                      </p>
                    </div>

                    {/* Mapping tables */}
                    {mappingTarget === 'projet' && (
                      <MappingDropdownTable
                        fields={PROJECT_FIELDS}
                        clientHeaders={clientHeaders}
                        mappings={projectMappings}
                        onChange={(key, val) =>
                          setProjectMappings(prev => ({ ...prev, [key]: val }))
                        }
                        sectionLabel="Champs du formulaire projet"
                      />
                    )}

                    {mappingTarget === 'tranche' && (
                      <div className="space-y-6">
                        <MappingDropdownTable
                          fields={TRANCHE_FIELDS_PHYSICAL}
                          clientHeaders={clientHeaders}
                          mappings={tranchePhysicalMappings}
                          onChange={(key, val) =>
                            setTranchePhysicalMappings(prev => ({ ...prev, [key]: val }))
                          }
                          sectionLabel="Personnes Physiques"
                        />
                        <MappingDropdownTable
                          fields={TRANCHE_FIELDS_MORAL}
                          clientHeaders={clientHeaders}
                          mappings={trancheMoralMappings}
                          onChange={(key, val) =>
                            setTrancheMoralMappings(prev => ({ ...prev, [key]: val }))
                          }
                          sectionLabel="Personnes Morales"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Wizard Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <div className="text-xs text-slate-500">
                  {wizardStep === 'map' && <span>{mappedCount} champ(s) mappé(s)</span>}
                </div>
                <div className="flex gap-3">
                  {wizardStep !== 'choose' && (
                    <button
                      onClick={() => {
                        if (wizardStep === 'upload') {
                          setWizardStep('choose');
                        }
                        if (wizardStep === 'map') {
                          setWizardStep('upload');
                        }
                      }}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Retour
                    </button>
                  )}
                  {wizardStep === 'choose' && (
                    <button
                      onClick={() => setWizardStep('upload')}
                      disabled={!canProceedFromChoose}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  {wizardStep === 'map' && (
                    <button
                      onClick={handleSave}
                      disabled={saving || mappedCount === 0}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════ VIEW MODAL ═══════════════════════════ */}
      {viewProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setViewProfile(null)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-900">{viewProfile.profile_name}</h2>
                </div>
                <button
                  onClick={() => setViewProfile(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* General info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Société</p>
                    <p className="text-sm font-medium text-slate-900">
                      {viewProfile.is_standard
                        ? 'Standard'
                        : viewProfile.organizations?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Statut</p>
                    <p className="text-sm font-medium text-slate-900">
                      {viewProfile.is_active ? 'Actif' : 'Inactif'} &middot; v{viewProfile.version}
                    </p>
                  </div>
                </div>

                {/* Project mappings */}
                {(() => {
                  const pm = viewProfile.format_config.project_import?.column_mappings;
                  if (!pm || Object.keys(pm).length === 0) {
                    return null;
                  }
                  return (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-violet-600" />
                        Mapping Projet ({Object.keys(pm).length} champs)
                      </h3>
                      <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200">
                        {Object.entries(pm).map(([fieldKey, clientCol]) => {
                          const fieldDef = PROJECT_FIELDS.find(f => f.key === fieldKey);
                          return (
                            <div
                              key={fieldKey}
                              className="flex items-center gap-2 px-3 py-2 text-sm"
                            >
                              <span className="font-medium text-slate-700 min-w-[160px]">
                                {fieldDef?.label || fieldKey}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-violet-700 bg-violet-50 px-2 py-0.5 rounded text-xs border border-violet-200">
                                {clientCol}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Tranche mappings */}
                {(() => {
                  const cm = viewProfile.format_config.column_mappings;
                  if (!cm) {
                    return null;
                  }
                  const physical = Object.entries(cm.physical || {});
                  const moral = Object.entries(cm.moral || {});
                  if (physical.length === 0 && moral.length === 0) {
                    return null;
                  }
                  return (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        Mapping Tranche ({physical.length + moral.length} champs)
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {physical.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Personnes Physiques</p>
                            <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                              {physical.map(([clientCol, standardCol]) => (
                                <div
                                  key={clientCol}
                                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs"
                                >
                                  <span className="text-slate-500 truncate">{clientCol}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="font-medium text-emerald-700">
                                    {standardCol}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {moral.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Personnes Morales</p>
                            <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                              {moral.map(([clientCol, standardCol]) => (
                                <div
                                  key={clientCol}
                                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs"
                                >
                                  <span className="text-slate-500 truncate">{clientCol}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="font-medium text-emerald-700">
                                    {standardCol}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <details>
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                    Configuration JSON brute
                  </summary>
                  <pre className="mt-2 bg-slate-50 p-3 rounded-lg overflow-x-auto text-xs font-mono text-slate-700">
                    {JSON.stringify(viewProfile.format_config, null, 2)}
                  </pre>
                </details>
              </div>

              <div className="flex justify-between gap-3 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  onClick={() => {
                    setViewProfile(null);
                    openWizardEdit(viewProfile);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => setViewProfile(null)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deletingProfile && (
        <ConfirmModal
          isOpen={!!deletingProfile}
          onClose={() => setDeletingProfile(null)}
          onConfirm={handleDelete}
          title="Supprimer le profil"
          message={`Supprimer le profil "${deletingProfile.profile_name}" ? Cette action est irréversible.`}
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}

      {showAlertModal && (
        <AlertModal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
        />
      )}
    </div>
  );
}
