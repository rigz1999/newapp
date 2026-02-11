// Gestion des profils de format pour l'import de registre des titres
// et l'import de projets depuis fichiers Excel
// Accessible uniquement aux super admins

import { useState, useEffect, useCallback } from 'react';
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
  ChevronRight,
  Info,
} from 'lucide-react';
import { TableSkeleton } from '../common/Skeleton';
import { AlertModal, ConfirmModal } from '../common/Modals';
import { logger } from '../../utils/logger';
import { toast } from '../../utils/toast';
import { logAuditEvent } from '../../utils/auditLogger';

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
  organizations?: {
    name: string;
  };
}

interface FormatConfig {
  file_type?: string;
  accepted_extensions?: string[];
  structure?: {
    type: 'two_sections' | 'single_list';
    section_markers?: { physical: string; moral: string };
    type_column?: string;
    type_values?: { physical: string; moral: string };
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
  validation_rules?: {
    required_fields_physical?: string[];
    required_fields_moral?: string[];
    email_validation?: boolean;
    siren_length?: number;
    phone_validation?: boolean;
  };
  project_import?: {
    field_aliases: Record<string, string[]>;
  };
}

interface Organization {
  id: string;
  name: string;
}

type EditorTab = 'general' | 'registre' | 'project';

// =============================================================================
// CONSTANTS — standard field definitions
// =============================================================================

const STANDARD_FIELDS_PHYSICAL = [
  'Quantité',
  'Montant',
  'Nom(s)',
  'Prénom(s)',
  'Nom de jeune fille',
  'E-mail',
  'Téléphone',
  'Né(e) le',
  'Lieu de naissance',
  'Département de naissance',
  'Adresse du domicile',
  'Code Postal',
  'Ville',
  'Pays',
  'Résidence Fiscale 1',
  'PPE',
  'Catégorisation',
  'Date de Transfert',
  'Date de Validation BS',
  'PEA / PEA-PME',
  'Numéro de Compte PEA / PEA-PME',
  'CGP',
  'E-mail du CGP',
  'Code du CGP',
  'Siren du CGP',
];

const STANDARD_FIELDS_MORAL = [
  'Quantité',
  'Montant',
  'Raison sociale',
  'N° SIREN',
  'E-mail du représentant légal',
  'Prénom du représentant légal',
  'Nom du représentant légal',
  'Téléphone',
  'Adresse du siège social',
  'Code Postal',
  'Ville',
  'Pays',
  'Résidence Fiscale 1 du représentant légal',
  'Département de naissance du représentant',
  'PPE',
  'Catégorisation',
  'Date de Transfert',
  'Date de Validation BS',
  'PEA / PEA-PME',
  'Numéro de Compte PEA / PEA-PME',
  'CGP',
  'E-mail du CGP',
  'Code du CGP',
  'Siren du CGP',
];

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
  { key: 'base_interet', label: "Base d'intérêt (360/365)", required: false },
  { key: 'nom_representant', label: 'Nom du représentant', required: false },
  { key: 'prenom_representant', label: 'Prénom du représentant', required: false },
  { key: 'email_representant', label: 'Email du représentant', required: false },
  { key: 'representant_masse', label: 'Représentant de la masse', required: false },
  { key: 'email_rep_masse', label: 'Email rep. masse', required: false },
  { key: 'telephone_rep_masse', label: 'Tél. rep. masse', required: false },
  { key: 'apply_flat_tax', label: 'Appliquer PFU (Oui/Non)', required: false },
];

// =============================================================================
// HELPER: convert format_config <-> editor state
// =============================================================================

/**
 * Invert column mappings from {clientCol: standardCol} to {standardCol: clientCol}
 * for easier editing in the UI
 */
function invertMappings(mappings: Record<string, string>): Record<string, string> {
  const inverted: Record<string, string> = {};
  for (const [clientCol, standardCol] of Object.entries(mappings)) {
    inverted[standardCol] = clientCol;
  }
  return inverted;
}

/**
 * Re-invert from {standardCol: clientCol} back to {clientCol: standardCol}
 * for storage in format_config
 */
function revertMappings(inverted: Record<string, string>): Record<string, string> {
  const reverted: Record<string, string> = {};
  for (const [standardCol, clientCol] of Object.entries(inverted)) {
    if (clientCol.trim()) {
      reverted[clientCol.trim()] = standardCol;
    }
  }
  return reverted;
}

function aliasArrayToString(aliases: string[]): string {
  return aliases.join(', ');
}

function aliasStringToArray(str: string): string[] {
  return str
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// =============================================================================
// EDITOR STATE
// =============================================================================

interface EditorState {
  profileName: string;
  description: string;
  companyId: string;
  isActive: boolean;
  // Registre structure
  structureType: 'two_sections' | 'single_list';
  sectionMarkerPhysical: string;
  sectionMarkerMoral: string;
  typeColumn: string;
  typeValuePhysical: string;
  typeValueMoral: string;
  // Registre column mappings (inverted: standardField → clientColumn)
  physicalMappings: Record<string, string>;
  moralMappings: Record<string, string>;
  skipRowsWith: string;
  // Project import (fieldKey → comma-separated aliases)
  projectAliases: Record<string, string>;
}

function profileToEditorState(profile: FormatProfile | null): EditorState {
  const config = profile?.format_config || {};
  const structure = config.structure || { type: 'two_sections' as const };

  // Invert column_mappings for editing
  const physicalRaw = config.column_mappings?.physical || {};
  const moralRaw = config.column_mappings?.moral || {};

  // Convert project_import aliases to comma-separated strings
  const projectAliasesRaw = config.project_import?.field_aliases || {};
  const projectAliases: Record<string, string> = {};
  for (const field of PROJECT_FIELDS) {
    projectAliases[field.key] = projectAliasesRaw[field.key]
      ? aliasArrayToString(projectAliasesRaw[field.key])
      : '';
  }

  return {
    profileName: profile?.profile_name || '',
    description: profile?.description || '',
    companyId: profile?.company_id || '',
    isActive: profile?.is_active ?? true,
    structureType: structure.type || 'two_sections',
    sectionMarkerPhysical: structure.section_markers?.physical || 'Personnes Physiques',
    sectionMarkerMoral: structure.section_markers?.moral || 'Personnes Morales',
    typeColumn: structure.type_column || '',
    typeValuePhysical: structure.type_values?.physical || '',
    typeValueMoral: structure.type_values?.moral || '',
    physicalMappings: invertMappings(physicalRaw),
    moralMappings: invertMappings(moralRaw),
    skipRowsWith: (config.data_transformations?.skip_rows_with || []).join(', '),
    projectAliases,
  };
}

function editorStateToFormatConfig(state: EditorState): FormatConfig {
  const config: FormatConfig = {
    file_type: 'excel',
    accepted_extensions: ['.xlsx', '.xls', '.csv'],
    structure: {
      type: state.structureType,
      ...(state.structureType === 'two_sections'
        ? {
            section_markers: {
              physical: state.sectionMarkerPhysical,
              moral: state.sectionMarkerMoral,
            },
          }
        : {
            type_column: state.typeColumn,
            type_values: {
              physical: state.typeValuePhysical,
              moral: state.typeValueMoral,
            },
          }),
      encoding: 'utf-8',
      fallback_encoding: 'windows-1252',
    },
    column_mappings: {
      physical: revertMappings(state.physicalMappings),
      moral: revertMappings(state.moralMappings),
    },
    data_transformations: {
      date_format: 'dd/mm/yyyy',
      date_format_alternative: 'yyyy-mm-dd',
      decimal_separator: ',',
      phone_format: 'international',
      skip_rows_with: aliasStringToArray(state.skipRowsWith),
    },
    validation_rules: {
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
    },
  };

  // Only include project_import if at least one alias is set
  const projectAliases: Record<string, string[]> = {};
  let hasAny = false;
  for (const field of PROJECT_FIELDS) {
    const arr = aliasStringToArray(state.projectAliases[field.key] || '');
    if (arr.length > 0) {
      projectAliases[field.key] = arr;
      hasAny = true;
    }
  }
  if (hasAny) {
    config.project_import = { field_aliases: projectAliases };
  }

  return config;
}

// =============================================================================
// COLUMN MAPPING TABLE COMPONENT
// =============================================================================

function MappingTable({
  standardFields,
  mappings,
  onChange,
  sectionLabel,
}: {
  standardFields: string[];
  mappings: Record<string, string>;
  onChange: (field: string, value: string) => void;
  sectionLabel: string;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 mb-2">{sectionLabel}</h4>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200">
          <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase">
            Champ standard
          </div>
          <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase">
            Colonne dans le fichier client
          </div>
        </div>
        <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
          {standardFields.map(field => {
            const clientCol = mappings[field] || '';
            const isIdentity = clientCol === field;
            return (
              <div key={field} className="grid grid-cols-2 items-center">
                <div className="px-3 py-1.5 text-sm text-slate-700 truncate" title={field}>
                  {field}
                </div>
                <div className="px-2 py-1">
                  <input
                    type="text"
                    value={clientCol}
                    onChange={e => onChange(field, e.target.value)}
                    placeholder={isIdentity ? '— identique —' : '— non mappé —'}
                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                      clientCol
                        ? 'border-slate-300 bg-white'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  />
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
// PROJECT ALIASES TABLE COMPONENT
// =============================================================================

function ProjectAliasesTable({
  aliases,
  onChange,
}: {
  aliases: Record<string, string>;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-[200px_1fr] bg-slate-50 border-b border-slate-200">
        <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase">Champ projet</div>
        <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase">
          Noms de colonnes acceptés (séparés par des virgules)
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
        {PROJECT_FIELDS.map(field => {
          const value = aliases[field.key] || '';
          return (
            <div key={field.key} className="grid grid-cols-[200px_1fr] items-center">
              <div className="px-3 py-1.5">
                <span className="text-sm text-slate-700">{field.label}</span>
                {field.required && <span className="text-finixar-red ml-0.5">*</span>}
              </div>
              <div className="px-2 py-1">
                <input
                  type="text"
                  value={value}
                  onChange={e => onChange(field.key, e.target.value)}
                  placeholder="— utilise les alias par défaut —"
                  className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                    value
                      ? 'border-slate-300 bg-white'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                />
              </div>
            </div>
          );
        })}
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
  const [selectedProfile, setSelectedProfile] = useState<FormatProfile | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Editor modal
  const [showEditor, setShowEditor] = useState(false);
  const [editingProfile, setEditingProfile] = useState<FormatProfile | null>(null);
  const [editorState, setEditorState] = useState<EditorState>(profileToEditorState(null));
  const [activeTab, setActiveTab] = useState<EditorTab>('general');

  // Delete confirm
  const [deletingProfile, setDeletingProfile] = useState<FormatProfile | null>(null);

  // Alert
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

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
  // CRUD ACTIONS
  // ─────────────────────────────────────────────────────────────────────

  function openCreate(): void {
    setEditingProfile(null);
    setEditorState(profileToEditorState(null));
    setActiveTab('general');
    setShowEditor(true);
  }

  function openEdit(profile: FormatProfile): void {
    setEditingProfile(profile);
    setEditorState(profileToEditorState(profile));
    setActiveTab('general');
    setShowEditor(true);
  }

  function openView(profile: FormatProfile): void {
    setSelectedProfile(profile);
    setShowViewModal(true);
  }

  async function handleSave(): Promise<void> {
    // Validate
    if (!editorState.profileName.trim()) {
      toast.error('Le nom du profil est obligatoire');
      setActiveTab('general');
      return;
    }
    if (!editingProfile?.is_standard && !editorState.companyId) {
      toast.error('Veuillez sélectionner une organisation');
      setActiveTab('general');
      return;
    }

    setSaving(true);
    try {
      const formatConfig = editorStateToFormatConfig(editorState);

      if (editingProfile) {
        // UPDATE
        const updatePayload: Record<string, unknown> = {
          profile_name: editorState.profileName.trim(),
          description: editorState.description.trim() || null,
          is_active: editorState.isActive,
          format_config: formatConfig,
        };
        // Don't change company_id for standard profiles
        if (!editingProfile.is_standard) {
          updatePayload.company_id = editorState.companyId || null;
        }

        const { error } = await supabase
          .from('company_format_profiles')
          .update(updatePayload)
          .eq('id', editingProfile.id);

        if (error) {
          throw error;
        }

        logAuditEvent({
          action: 'updated',
          entityType: 'format_profile',
          entityId: editingProfile.id,
          description: `Profil de format "${editorState.profileName}" mis à jour`,
        });

        toast.success('Profil mis à jour');
      } else {
        // CREATE
        const { error } = await supabase.from('company_format_profiles').insert({
          profile_name: editorState.profileName.trim(),
          description: editorState.description.trim() || null,
          company_id: editorState.companyId || null,
          is_standard: false,
          is_active: editorState.isActive,
          format_config: formatConfig,
        });

        if (error) {
          throw error;
        }

        logAuditEvent({
          action: 'created',
          entityType: 'format_profile',
          entityId: '',
          description: `Profil de format "${editorState.profileName}" créé`,
        });

        toast.success('Profil créé');
      }

      setShowEditor(false);
      await fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('Erreur sauvegarde profil:', error);

      if (msg.includes('idx_unique_active_company_profile')) {
        toast.error(
          "Cette organisation a déjà un profil actif. Désactivez-le avant d'en créer un nouveau."
        );
      } else {
        toast.error(`Erreur: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
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
        description: `Profil de format "${deletingProfile.profile_name}" supprimé`,
      });

      toast.success('Profil supprimé');
      setDeletingProfile(null);
      await fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('Erreur suppression profil:', error);
      toast.error(`Erreur: ${msg}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // EDITOR STATE HELPERS
  // ─────────────────────────────────────────────────────────────────────

  const updateEditor = (patch: Partial<EditorState>) => {
    setEditorState(prev => ({ ...prev, ...patch }));
  };

  const updatePhysicalMapping = (field: string, value: string) => {
    setEditorState(prev => ({
      ...prev,
      physicalMappings: { ...prev.physicalMappings, [field]: value },
    }));
  };

  const updateMoralMapping = (field: string, value: string) => {
    setEditorState(prev => ({
      ...prev,
      moralMappings: { ...prev.moralMappings, [field]: value },
    }));
  };

  const updateProjectAlias = (field: string, value: string) => {
    setEditorState(prev => ({
      ...prev,
      projectAliases: { ...prev.projectAliases, [field]: value },
    }));
  };

  // Count mapped fields for badge display
  const countMappedRegistre = (): number => {
    const p = Object.values(editorState.physicalMappings).filter(v => v.trim()).length;
    const m = Object.values(editorState.moralMappings).filter(v => v.trim()).length;
    return p + m;
  };

  const countMappedProject = (): number =>
    Object.values(editorState.projectAliases).filter(v => v.trim()).length;

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
                Gérez les correspondances de colonnes pour l'import registre et l'import projets par
                société
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Dernière MAJ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-600">Aucun profil de format</p>
                  </td>
                </tr>
              ) : (
                profiles.map(profile => {
                  const config = profile.format_config as FormatConfig;
                  const registreCount =
                    Object.keys(config.column_mappings?.physical || {}).length +
                    Object.keys(config.column_mappings?.moral || {}).length;
                  const projectCount = Object.keys(
                    config.project_import?.field_aliases || {}
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
                            Format Standard
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
                              Registre {registreCount}
                            </span>
                          )}
                          {projectCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                              Projets {projectCount}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {new Date(profile.updated_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openView(profile)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(profile)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!profile.is_standard && (
                            <button
                              onClick={() => setDeletingProfile(profile)}
                              className="p-2 text-finixar-red hover:bg-red-50 rounded-lg transition-colors"
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

      {/* ─────────────────────────── EDITOR MODAL ─────────────────────────── */}
      {showEditor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => !saving && setShowEditor(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
              {/* Editor Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${editingProfile ? 'bg-amber-100' : 'bg-emerald-100'}`}
                  >
                    {editingProfile ? (
                      <Edit2 className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Plus className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {editingProfile ? 'Modifier le profil' : 'Nouveau profil'}
                    </h2>
                    {editingProfile && (
                      <p className="text-xs text-slate-500">
                        {editingProfile.profile_name} &middot; v{editingProfile.version}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => !saving && setShowEditor(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
                {(
                  [
                    { id: 'general', label: 'Général' },
                    {
                      id: 'registre',
                      label: 'Import Registre',
                      badge: countMappedRegistre(),
                    },
                    {
                      id: 'project',
                      label: 'Import Projets',
                      badge: countMappedProject(),
                    },
                  ] as { id: EditorTab; label: string; badge?: number }[]
                ).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* ──── GENERAL TAB ──── */}
                {activeTab === 'general' && (
                  <div className="space-y-5 max-w-2xl">
                    {/* Organisation (not for standard profile) */}
                    {!editingProfile?.is_standard && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Organisation <span className="text-finixar-red">*</span>
                        </label>
                        <select
                          value={editorState.companyId}
                          onChange={e => updateEditor({ companyId: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        value={editorState.profileName}
                        onChange={e => updateEditor({ profileName: e.target.value })}
                        placeholder="Ex: Format Client ABC"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editorState.description}
                        onChange={e => updateEditor({ description: e.target.value })}
                        rows={2}
                        placeholder="Description optionnelle du profil..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editorState.isActive}
                          onChange={e => updateEditor({ isActive: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <span className="text-sm text-slate-700">Profil actif</span>
                    </div>
                  </div>
                )}

                {/* ──── REGISTRE IMPORT TAB ──── */}
                {activeTab === 'registre' && (
                  <div className="space-y-6">
                    {/* Structure config */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">
                        Structure du fichier
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Type de structure
                          </label>
                          <select
                            value={editorState.structureType}
                            onChange={e =>
                              updateEditor({
                                structureType: e.target.value as 'two_sections' | 'single_list',
                              })
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            <option value="two_sections">
                              Deux sections (Pers. Physiques / Pers. Morales)
                            </option>
                            <option value="single_list">
                              Liste unique (colonne type détermine PP/PM)
                            </option>
                          </select>
                        </div>

                        {editorState.structureType === 'two_sections' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Marqueur section physique
                              </label>
                              <input
                                type="text"
                                value={editorState.sectionMarkerPhysical}
                                onChange={e =>
                                  updateEditor({ sectionMarkerPhysical: e.target.value })
                                }
                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Marqueur section morale
                              </label>
                              <input
                                type="text"
                                value={editorState.sectionMarkerMoral}
                                onChange={e => updateEditor({ sectionMarkerMoral: e.target.value })}
                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Colonne type
                              </label>
                              <input
                                type="text"
                                value={editorState.typeColumn}
                                onChange={e => updateEditor({ typeColumn: e.target.value })}
                                placeholder="Ex: Type"
                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Valeur pers. physique
                              </label>
                              <input
                                type="text"
                                value={editorState.typeValuePhysical}
                                onChange={e => updateEditor({ typeValuePhysical: e.target.value })}
                                placeholder="Ex: Physique"
                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Valeur pers. morale
                              </label>
                              <input
                                type="text"
                                value={editorState.typeValueMoral}
                                onChange={e => updateEditor({ typeValueMoral: e.target.value })}
                                placeholder="Ex: Morale"
                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Lignes à ignorer (séparées par des virgules)
                          </label>
                          <input
                            type="text"
                            value={editorState.skipRowsWith}
                            onChange={e => updateEditor({ skipRowsWith: e.target.value })}
                            placeholder="TOTAL, SOUS-TOTAL, Total, Sous-total"
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Info banner */}
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-800">
                        Pour chaque champ standard, indiquez le nom de la colonne tel qu'il apparaît
                        dans le fichier Excel du client. Laissez vide si le champ n'existe pas dans
                        le fichier.
                      </p>
                    </div>

                    {/* Physical mappings */}
                    <MappingTable
                      standardFields={STANDARD_FIELDS_PHYSICAL}
                      mappings={editorState.physicalMappings}
                      onChange={updatePhysicalMapping}
                      sectionLabel="Personnes Physiques"
                    />

                    {/* Moral mappings */}
                    <MappingTable
                      standardFields={STANDARD_FIELDS_MORAL}
                      mappings={editorState.moralMappings}
                      onChange={updateMoralMapping}
                      sectionLabel="Personnes Morales"
                    />
                  </div>
                )}

                {/* ──── PROJECT IMPORT TAB ──── */}
                {activeTab === 'project' && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 bg-violet-50 border border-violet-200 rounded-lg p-3">
                      <Info className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                      <div className="text-xs text-violet-800 space-y-1">
                        <p>
                          Configurez les noms de colonnes que le fichier Excel du client utilise
                          pour chaque champ du formulaire de création de projet.
                        </p>
                        <p>
                          Séparez plusieurs noms alternatifs par des <strong>virgules</strong>. Le
                          système utilise du matching flou pour tolérer les variations mineures.
                        </p>
                        <p>
                          Laissez vide pour utiliser les alias par défaut, ou remplissez pour les
                          remplacer. Les champs sans correspondance resteront vides dans le
                          formulaire.
                        </p>
                      </div>
                    </div>

                    <ProjectAliasesTable
                      aliases={editorState.projectAliases}
                      onChange={updateProjectAlias}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <div className="text-xs text-slate-500">
                  {activeTab === 'registre' && (
                    <span>{countMappedRegistre()} champ(s) mappé(s)</span>
                  )}
                  {activeTab === 'project' && (
                    <span>{countMappedProject()} champ(s) configuré(s)</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditor(false)}
                    disabled={saving}
                    className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── VIEW MODAL ─────────────────────────── */}
      {showViewModal && selectedProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowViewModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedProfile.profile_name}
                    </h2>
                    {selectedProfile.description && (
                      <p className="text-sm text-slate-600">{selectedProfile.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* General info */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                    Informations générales
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Société</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedProfile.is_standard
                          ? 'Format Standard'
                          : selectedProfile.organizations?.name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Version</p>
                      <p className="text-sm font-medium text-slate-900">
                        v{selectedProfile.version}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Statut</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedProfile.is_active ? 'Actif' : 'Inactif'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Dernière MAJ</p>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(selectedProfile.updated_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Registre mappings summary */}
                {(() => {
                  const config = selectedProfile.format_config as FormatConfig;
                  const physical = config.column_mappings?.physical || {};
                  const moral = config.column_mappings?.moral || {};
                  const physicalEntries = Object.entries(physical);
                  const moralEntries = Object.entries(moral);

                  if (physicalEntries.length === 0 && moralEntries.length === 0) {
                    return null;
                  }

                  return (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                        Mappings Registre
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {physicalEntries.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-2">
                              Personnes Physiques ({physicalEntries.length})
                            </p>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                              {physicalEntries.map(([client, standard]) => (
                                <div key={client} className="flex items-center gap-1.5 text-xs">
                                  <span className="text-slate-500 truncate max-w-[120px]">
                                    {client}
                                  </span>
                                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="font-medium text-slate-700 truncate">
                                    {standard}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {moralEntries.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-2">
                              Personnes Morales ({moralEntries.length})
                            </p>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                              {moralEntries.map(([client, standard]) => (
                                <div key={client} className="flex items-center gap-1.5 text-xs">
                                  <span className="text-slate-500 truncate max-w-[120px]">
                                    {client}
                                  </span>
                                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="font-medium text-slate-700 truncate">
                                    {standard}
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

                {/* Project import aliases summary */}
                {(() => {
                  const config = selectedProfile.format_config as FormatConfig;
                  const aliases = config.project_import?.field_aliases || {};
                  const entries = Object.entries(aliases);

                  if (entries.length === 0) {
                    return null;
                  }

                  return (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                        Mappings Import Projets
                      </h3>
                      <div className="space-y-2">
                        {entries.map(([fieldKey, fieldAliases]) => {
                          const fieldDef = PROJECT_FIELDS.find(f => f.key === fieldKey);
                          return (
                            <div key={fieldKey} className="flex items-start gap-2 text-xs">
                              <span className="font-medium text-slate-700 min-w-[140px] shrink-0">
                                {fieldDef?.label || fieldKey}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {(fieldAliases as string[]).map((alias, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded border border-violet-200"
                                  >
                                    {alias}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Raw JSON (collapsed) */}
                <details className="group">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                    Afficher la configuration JSON brute
                  </summary>
                  <pre className="mt-2 bg-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono text-slate-700">
                    {JSON.stringify(selectedProfile.format_config, null, 2)}
                  </pre>
                </details>
              </div>

              {/* Footer */}
              <div className="flex justify-between gap-3 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openEdit(selectedProfile);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── DELETE CONFIRM ─────────────────────── */}
      {deletingProfile && (
        <ConfirmModal
          isOpen={!!deletingProfile}
          onClose={() => setDeletingProfile(null)}
          onConfirm={handleDelete}
          title="Supprimer le profil"
          message={`Êtes-vous sûr de vouloir supprimer le profil "${deletingProfile.profile_name}" ? Cette action est irréversible.`}
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}

      {/* Alert Modal */}
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
