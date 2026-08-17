import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://ghjsluyiejtxfpakbpbf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoanNsdXlpZWp0eGZwYWticGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MTY5MDAsImV4cCI6MjEwMjQ5MjkwMH0.nFGh0x4XZramgc2vOxYXC7XAOakH1A_s6QRWK0hixb0";

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
