// Physio Pro SA — shared barrel
// ph_ localStorage namespace throughout
// All screens import from here — single source of truth.

// Platform core — config, supabase, audit, mock data, hooks
// Exports: C, USE_MOCK, SUPABASE_URL, SUPABASE_ANON, auth, sbAuth,
//          AuthContext, DataContext, LS, billing engine, ICD-10, tariffs
export * from "@prosa/core";

// Platform UI — Badge, Card, Btn, StatCard, form components
export * from "@prosa/ui";
