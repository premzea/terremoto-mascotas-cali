import { createClient } from "@supabase/supabase-js";

// Authoritative Supabase project for Búsqueda Animal Cali: ghjsluyiejtxfpakbpbf
const AUTHORITATIVE_SUPABASE_URL = "https://ghjsluyiejtxfpakbpbf.supabase.co";
const AUTHORITATIVE_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoanNsdXlpZWp0eGZwYWticGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MTY5MDAsImV4cCI6MjEwMjQ5MjkwMH0.nFGh0x4XZramgc2vOxYXC7XAOakH1A_s6QRWK0hixb0";

// Only use env variables if they match the correct project; otherwise use authoritative values
const rawEnvUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
export const supabaseUrl = rawEnvUrl.includes("ghjsluyiejtxfpakbpbf")
  ? rawEnvUrl
  : AUTHORITATIVE_SUPABASE_URL;

const rawEnvKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
export const supabaseAnonKey = rawEnvKey.includes("ghjsluyiejtxfpakbpbf")
  ? rawEnvKey
  : AUTHORITATIVE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
