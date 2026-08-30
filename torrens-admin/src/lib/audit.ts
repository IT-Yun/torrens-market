import 'server-only';
import { db } from './db';

export async function audit(action: string, targetType: string, targetId: string,
  before: unknown, after: unknown, note?: string) {
  const { error } = await db.from('admin_audit_log').insert({
    actor: 'local-operator', action, target_type: targetType, target_id: targetId,
    before: before ?? null, after: after ?? null, note: note ?? null,
  });
  if (error) console.error('audit insert failed', error.message);
}
