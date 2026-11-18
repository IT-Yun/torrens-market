import { supabase } from './supabase';

export type KeywordAlert = {
  id: string;
  keyword: string;
  category_id: number | null;
  max_price_cents: number | null;
  active: boolean;
};

export async function fetchAlerts(userId: string): Promise<KeywordAlert[]> {
  const { data, error } = await supabase
    .from('keyword_alerts')
    .select('id, keyword, category_id, max_price_cents, active')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as KeywordAlert[]) ?? [];
}

export async function addAlert(userId: string, keyword: string): Promise<void> {
  const { error } = await supabase
    .from('keyword_alerts')
    .insert({ user_id: userId, keyword: keyword.trim() });
  if (error) throw error;
}

export async function removeAlert(alertId: string): Promise<void> {
  const { error } = await supabase.from('keyword_alerts').delete().eq('id', alertId);
  if (error) throw error;
}
