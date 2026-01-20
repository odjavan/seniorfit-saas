import { createClient } from '@supabase/supabase-js';

// Credenciais do Projeto SeniorFit - Supabase Cloud
const supabaseUrl = 'https://seporcnzpysaniisprin.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcG9yY256cHlzYW5paXNwcmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODU0NjgsImV4cCI6MjA4NDQ2MTQ2OH0.uSZHjCzL8K4jp3EFF04YydcI0SpLdgBjQWEWP_xNn_w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});