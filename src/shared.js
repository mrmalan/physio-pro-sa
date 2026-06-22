// Physio Pro SA — single source of truth
// Direct imports, no aliasing, no barrel indirection

// Config — physio Supabase creds hardcoded as fallback
export * from "./config.js";

// Supabase client, auth helpers
export * from "./packages/core/supabase.js";

// Audit logging, style examples
export * from "./packages/core/audit.js";

// Mock data, colour tokens (C)
export * from "./packages/core/mockdata.js";

// React contexts and hooks
export * from "./packages/core/hooks.js";

// Medical aid billing engine
export * from "./packages/core/billing.js";

// ICD-10 codes
export * from "./packages/core/icd10.js";

// NHRPL physio tariff codes
export * from "./packages/core/tariffs_physio.js";

// UI components — Badge, Card, Btn, StatCard, Field, Input etc.
export * from "./packages/ui/ui.jsx";
export * from "./packages/ui/formui.jsx";
