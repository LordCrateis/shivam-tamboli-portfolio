import { createClient } from '@supabase/supabase-js';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(configuredUrl && configuredAnonKey);

// Keep the public portfolio previewable when the private/local Supabase values are not present.
// Any data-backed features will show their existing error/empty states until real values are supplied.
const supabaseUrl = configuredUrl || 'https://preview-placeholder.supabase.co';
const supabaseAnonKey = configuredAnonKey || 'preview-placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
