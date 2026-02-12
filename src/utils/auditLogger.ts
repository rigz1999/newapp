import { supabase } from '../lib/supabase';
import { logger } from './logger';

export type AuditAction = 'created' | 'updated' | 'deleted' | 'status_changed';

export type AuditEntityType =
  | 'paiement'
  | 'projet'
  | 'tranche'
  | 'souscription'
  | 'investisseur'
  | 'membre'
  | 'invitation'
  | 'coupon_echeance'
  | 'organization'
  | 'payment_proof'
  | 'security'
  | 'consent'
  | 'data_export'
  | 'account_deletion';

export interface AuditLogParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  description: string;
  orgId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an audit event to the audit_logs table.
 * Fire-and-forget: never blocks the main operation.
 * Automatically captures the current user from Supabase auth.
 * Auto-resolves orgId from the user's membership if not provided.
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    // Get user profile for display name and superadmin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, is_superadmin')
      .eq('id', user.id)
      .maybeSingle();

    // Never log super admin actions
    if (profile?.is_superadmin) {
      return;
    }

    // Resolve orgId: use provided value, or auto-detect from user's membership
    let orgId = params.orgId || null;
    if (!orgId) {
      const { data: membership } = await supabase
        .from('memberships')
        .select('org_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      orgId = membership?.org_id || null;
    }

    const row = {
      org_id: orgId,
      user_id: user.id,
      user_email: user.email || null,
      user_name: profile?.full_name || user.email || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      description: params.description,
      metadata: params.metadata || {},
    };

    const { error } = await supabase.from('audit_logs').insert(row);

    if (error) {
      // Always log to console so audit failures are visible
      logger.error('[AuditLog] Failed to write audit log:', error.message, { error, row });
      logger.error(new Error('Failed to write audit log'), { error, params });
    }
  } catch (err) {
    // Never let audit logging break the main flow
    logger.error('[AuditLog] Exception in audit logger:', err);
    logger.error(err instanceof Error ? err : new Error('Audit log error'), {
      params,
    });
  }
}

/**
 * Helper to format currency in French locale for audit descriptions.
 */
export function auditFormatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Helper to format dates in French locale for audit descriptions.
 */
export function auditFormatDate(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return 'date inconnue';
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return 'date inconnue';
  }
  return d.toLocaleDateString('fr-FR');
}
