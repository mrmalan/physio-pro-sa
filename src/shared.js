// Physio Pro SA — shared barrel
// ph_ localStorage namespace throughout
// All screens import from here — single source of truth.

// Platform core — config, supabase, audit, mock data, hooks
export * from "@prosa/core";

// Platform UI — Badge, Card, Btn, form components, navigation
export * from "@prosa/ui";

// sbAuth re-exported explicitly
export { sbAuth } from "./screens/Auth.jsx";
