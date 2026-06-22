import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export let supabaseConfigError: string | null = null;

const isValidUrl = (url: string) => {
    if (!url) {
        supabaseConfigError = 'VITE_SUPABASE_URL is missing';
        return false;
    }
    if (!url.startsWith('https://')) {
        supabaseConfigError = 'VITE_SUPABASE_URL must start with https://';
        return false;
    }
    if (!url.includes('.supabase.co')) {
        supabaseConfigError = 'VITE_SUPABASE_URL must contain .supabase.co';
        return false;
    }
    return true;
};

const isConfigured = isValidUrl(supabaseUrl) && !!supabaseAnonKey;
if (!isConfigured && !supabaseConfigError && !supabaseAnonKey) {
    supabaseConfigError = 'VITE_SUPABASE_ANON_KEY is missing';
}

export const isSupabaseConfigured = isConfigured;

if (!isSupabaseConfigured) {
    console.error('Supabase Configuration Error:', supabaseConfigError);
}

// Create a safe fallback if config is missing to prevent immediate crash
export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder');
