import { createContext, useContext } from "react";
// OccHealth Pro SA — config, colour tokens, localStorage keys
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "YOUR_PROJECT";
export const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || "YOUR_ANON_KEY";
export const USE_MOCK = SUPABASE_URL.includes("YOUR_PROJECT");
export const VAT_RATE = 0.15;
export const APP_VERSION = "0.1.0";

// localStorage namespace
export const LS = {
  SESSION: "oh_session",
  MODULES: "oh_modules",
  PRACTICE: "oh_practice",
  SIGNED_NOTES: "oh_signed_notes",
};

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

