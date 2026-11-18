import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service-role client — server components / server actions only (never the browser).
// The console runs on localhost only (ADR-017); the machine is the boundary.
export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type Profile = {
  id: string; display_name: string | null; avatar_url: string | null; suburb: string | null;
  nationality: string | null; preferred_language: string | null; is_phone_verified: boolean;
  created_at: string; suburb_verified_at: string | null; banned: boolean;
};
export type Listing = {
  id: string; seller_id: string; title: string; price_cents: number; suburb: string;
  status: 'active' | 'reserved' | 'sold' | 'deleted'; created_at: string; category_id: number;
};
export type Report = {
  id: string; reporter_id: string; listing_id: string | null; reported_user_id: string | null;
  reason: string; detail: string | null; created_at: string;
  resolved_at: string | null; resolution: 'actioned' | 'dismissed' | null; resolution_note: string | null;
};
export type Feedback = {
  id: string; user_id: string | null; kind: string; message: string; app_version: string | null;
  created_at: string; resolved: boolean;
};
