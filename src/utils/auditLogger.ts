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
  | 'payment_proof';

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
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const { error } = await supabase.from('audit_logs').insert({
      org_id: params.orgId || null,
      user_id: user.id,
      user_email: user.email || null,
      user_name: profile?.full_name || user.email || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      description: params.description,
      metadata: params.metadata || {},
    });

    if (error) {
      logger.error(new Error('Failed to write audit log'), { error, params });
    }
  } catch (err) {
    // Never let audit logging break the main flow
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
export function auditFormatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR');
}
