import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wwtpedtdkgtnllmvrfhh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dHBlZHRka2d0bmxsbXZyZmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDQ3MzgsImV4cCI6MjA3MjMyMDczOH0.klduU7T1xh68EEg7SADwyVQ_ND1nA4Pben6M2asgBMM";

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
