import { createContext, useContext } from "react";

// Physio Pro SA — config
// Supabase credentials hardcoded as fallback — env vars take precedence if set
export const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "https://ezkrzptsnkdolsdjhgql.supabase.co";
export const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6a3J6cHRzbmtkb2xzZGpoZ3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDM3MTEsImV4cCI6MjA5NzcxOTcxMX0.cm8TfV2ap5BqUhYvq3isfsztuo8bb5mOgU1x3AdjY5E";
export const USE_MOCK = false;
export const VAT_RATE = 0.15;
export const APP_VERSION = "0.1.0";

export const LS = {
  SESSION:      "ph_session",
  MODULES:      "ph_modules",
  PRACTICE:     "ph_practice",
  SIGNED_NOTES: "ph_signed_notes",
};

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
