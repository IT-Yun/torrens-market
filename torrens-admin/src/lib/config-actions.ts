'use server';
import { revalidatePath } from 'next/cache';
import { db } from './db';
import { audit } from './audit';

export async function saveConfig(formData: FormData) {
  const entries: Record<string, unknown> = {
    maintenance_mode: formData.get('maintenance_mode') === 'on',
    uploads_enabled: formData.get('uploads_enabled') === 'on',
    min_app_version: String(formData.get('min_app_version') ?? '1.0.0'),
    banner: { en: String(formData.get('banner_en') ?? ''), ko: String(formData.get('banner_ko') ?? ''), zh: String(formData.get('banner_zh') ?? '') },
  };
  const { data: before } = await db.from('app_config').select('key, value');
  for (const [key, value] of Object.entries(entries)) {
    const { error } = await db.from('app_config').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }
  await audit('config.save', 'config', 'app_config', Object.fromEntries((before ?? []).map((b) => [b.key, b.value])), entries);
  revalidatePath('/config');
}
