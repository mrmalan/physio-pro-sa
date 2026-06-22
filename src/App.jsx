import { useState, useEffect, useMemo } from "react";
import React from "react";

// Shared — config, supabase, UI
import { C, USE_MOCK, SUPABASE_URL, SUPABASE_ANON, auth, sbAuth,
         AuthContext, DataContext } from "./shared.js";

// Screens
import { LoginScreen, OnboardingWizard } from "./screens/Auth.jsx";
import { Dashboard }    from "./screens/Dashboard.jsx";
import { Patients }     from "./screens/Patients.jsx";
import { Appointments } from "./screens/Appointments.jsx";
import { ClinicalNote } from "./screens/ClinicalNote.jsx";
import { Episodes }     from "./screens/Episodes.jsx";
import { MedicalAid }   from "./screens/MedicalAid.jsx";
import { Invoices }     from "./screens/Invoices.jsx";
import { Finance }      from "./screens/Finance.jsx";
import { CPDTracker }   from "./screens/CPDTracker.jsx";
import { Settings }     from "./screens/Settings.jsx";

// Navigation
import { Sidebar, TopBar } from "./components/navigation.jsx";

// ── ph_ localStorage namespace ────────────────────────────────────────────────
const PH_LS = {
  SESSION:  "ph_session",
  PRACTICE: "ph_practice",
  MODULES:  "ph_modules",
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_PATIENTS = [
  { id: "p1", first_name: "Sarah",  last_name: "Van der Merwe", dob: "1985-03-12", gender: "F",
    medical_aid_id: "discovery", medical_aid_number: "12345678", dependant_code: "00",
    plan_name: "Classic Comprehensive", phone: "082 555 1234", email: "sarah@example.com",
    referring_dr: "Dr. J. Smit", id_number: "8503120001087" },
  { id: "p2", first_name: "Sipho",  last_name: "Nkosi", dob: "1992-07-04", gender: "M",
    medical_aid_id: "bonitas", medical_aid_number: "BON-789012", dependant_code: "00",
    plan_name: "BonEssential", phone: "073 444 5678", email: "sipho@example.com",
    referring_dr: "Dr. A. Botha", id_number: "9207040001086" },
  { id: "p3", first_name: "Fatima", last_name: "Adams", dob: "1978-11-20", gender: "F",
    medical_aid_id: "gems", medical_aid_number: "GEMS-456789", dependant_code: "00",
    plan_name: "Sapphire", phone: "060 333 9012", email: "fatima@example.com",
    referring_dr: null, id_number: "7811200001082" },
  { id: "p4", first_name: "Johan",  last_name: "Pretorius", dob: "1965-05-30", gender: "M",
    medical_aid_id: null, medical_aid_number: null, dependant_code: null,
    plan_name: null, phone: "011 888 3456", email: "johan@example.com",
    referring_dr: "Dr. M. Dlamini", id_number: "6505300001084" },
];

const MOCK_EPISODES = [
  { id: "e1", patient_id: "p1", diagnosis: "Low back pain", icd10_primary: "M54.5",
    start_date: "2026-05-01", end_date: null, status: "active",
    sessions_planned: 10, sessions_completed: 4,
    medical_aid_id: "discovery", benefit_year: 2026, sessions_authorised: 15, sessions_used: 4 },
  { id: "e2", patient_id: "p2", diagnosis: "Rotator cuff syndrome", icd10_primary: "M75.1",
    start_date: "2026-04-10", end_date: "2026-06-01", status: "discharged",
    sessions_planned: 8, sessions_completed: 8,
    medical_aid_id: "bonitas", benefit_year: 2026, sessions_authorised: 10, sessions_used: 8 },
];

const MOCK_APPOINTMENTS = [
  { id: "a1", patient_id: "p1", episode_id: "e1",
    scheduled_at: "2026-06-23T09:00:00Z", duration_minutes: 45,
    status: "scheduled", appointment_type: "follow_up", room: "Room 1" },
  { id: "a2", patient_id: "p2", episode_id: "e2",
    scheduled_at: "2026-06-23T10:00:00Z", duration_minutes: 30,
    status: "scheduled", appointment_type: "follow_up", room: "Room 2" },
  { id: "a3", patient_id: "p3", episode_id: null,
    scheduled_at: "2026-06-23T11:00:00Z", duration_minutes: 60,
    status: "scheduled", appointment_type: "initial", room: "Room 1" },
];

const MOCK_NOTES = [
  { id: "n1", patient_id: "p1", episode_id: "e1", note_date: "2026-06-18",
    subjective: "Patient reports 6/10 low back pain radiating to left buttock. Worse with sitting > 30 min.",
    objective: "ROM: Lumbar flexion 60°/extension 20°. SLR positive L at 45°. Paraspinal muscle spasm L4–L5.",
    assessment: "Lumbar disc bulge with left-sided nerve root irritation at L4–L5.",
    plan: "TENS 20 min, joint mob L4–L5, home programme with McKenzie extension exercises x 3/day.",
    tariff_codes: ["18533", "18543", "18551"], icd10_primary: "M54.5",
    signed: true, signed_at: "2026-06-18T10:30:00Z" },
];

const MOCK_CLAIMS = [
  { id: "c1", patient_id: "p1", episode_id: "e1", note_id: "n1",
    claim_date: "2026-06-18", scheme_code: "DISC",
    tariff_code: "18533", icd10_code: "M54.5",
    quantity: 1, unit_amount: 485.00, total_amount: 485.00,
    status: "paid", amount_paid: 388.00, rejection_reason: null },
];

export const MOCK_SESSION = {
  access_token: "mock_token",
  user: { id: "mock_user", email: "demo@physioprosa.co.za",
    user_metadata: { full_name: "Demo Physiotherapist",
      practice_name: "Demo Physio Practice", hpcsa_number: "PT000001",
      onboarding_complete: true } },
};

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(() => {
    if (USE_MOCK) return MOCK_SESSION;
    try { const s = localStorage.getItem(PH_LS.SESSION); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });
  const [screen, setScreen]               = useState("dashboard");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [dataLoading, setDataLoading]     = useState(false);
  const [livePatients, setLivePatients]   = useState(null);
  const [liveEpisodes, setLiveEpisodes]   = useState(null);
  const [liveNotes, setLiveNotes]         = useState(null);
  const [liveAppts, setLiveAppts]         = useState(null);
  const [liveClaims, setLiveClaims]       = useState(null);

  const token = session?.access_token;
  const db    = useMemo(() => (token && !USE_MOCK) ? sbAuth(token) : null, [token]);

  const patients     = livePatients ?? MOCK_PATIENTS;
  const episodes     = liveEpisodes ?? MOCK_EPISODES;
  const notes        = liveNotes    ?? MOCK_NOTES;
  const appointments = liveAppts    ?? MOCK_APPOINTMENTS;
  const claims       = liveClaims   ?? MOCK_CLAIMS;

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
      caches.keys().then(ns => ns.forEach(n => caches.delete(n)));
    }
  }, []);

  useEffect(() => {
    if (!session || USE_MOCK || !token) return;
    try {
      const p = JSON.parse(atob(token.split(".")[1]));
      if (Date.now() > p.exp * 1000) { setSession(null); localStorage.removeItem(PH_LS.SESSION); return; }
    } catch {}
    loadAllData();
  }, [session?.access_token]);

  useEffect(() => {
    if (USE_MOCK || !session?.refresh_token) return;
    const refresh = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        });
        if (!res.ok) { setSession(null); localStorage.removeItem(PH_LS.SESSION); return; }
        const data = await res.json();
        const updated = { ...session, access_token: data.access_token, refresh_token: data.refresh_token };
        setSession(updated); localStorage.setItem(PH_LS.SESSION, JSON.stringify(updated));
      } catch {}
    };
    try {
      const p = JSON.parse(atob(session.access_token.split(".")[1]));
      if ((p.exp * 1000) - Date.now() < 10 * 60 * 1000) refresh();
    } catch {}
    const iv = setInterval(refresh, 50 * 60 * 1000);
    return () => clearInterval(iv);
  }, [session?.refresh_token]);

  const loadAllData = async () => {
    if (!db) return;
    setDataLoading(true);
    try {
      const [ptRes, epRes, apptRes, clRes] = await Promise.all([
        db.from("patient").select(""),
        db.from("episode_of_care").select(""),
        db.from("appointment").select("limit=50"),
        db.from("medical_aid_claim").select("limit=100"),
      ]);
      if (ptRes.data)   setLivePatients(ptRes.data);
      if (epRes.data)   setLiveEpisodes(epRes.data);
      if (apptRes.data) setLiveAppts(apptRes.data);
      if (clRes.data)   setLiveClaims(clRes.data);
      const meta = session?.user?.user_metadata;
      if (!meta?.onboarding_complete && ptRes.data !== null && ptRes.data.length === 0)
        setNeedsOnboarding(true);
    } catch (e) { console.warn("Data load error:", e); }
    setDataLoading(false);
  };

  const handleLogin = (sess) => {
    setSession(sess);
    localStorage.setItem(PH_LS.SESSION, JSON.stringify(sess));
    if (sess?.user?.user_metadata?.onboarding_complete === false) setNeedsOnboarding(true);
  };

  const handleLogout = async () => {
    if (!USE_MOCK && token) await auth.signOut(token).catch(() => {});
    setSession(null);
    [setLivePatients, setLiveEpisodes, setLiveNotes, setLiveAppts, setLiveClaims].forEach(fn => fn(null));
    setNeedsOnboarding(false);
    localStorage.removeItem(PH_LS.SESSION);
    setScreen("dashboard");
  };

  const handleOnboardingComplete = async () => {
    setNeedsOnboarding(false);
    if (token) {
      await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ data: { ...session?.user?.user_metadata, onboarding_complete: true } }),
      }).catch(() => {});
      const updated = { ...session, user: { ...session.user,
        user_metadata: { ...session.user.user_metadata, onboarding_complete: true } } };
      setSession(updated);
      localStorage.setItem(PH_LS.SESSION, JSON.stringify(updated));
      await loadAllData();
    }
  };

  const navigate    = (s) => setScreen(s);
  const refreshData = () => { if (!USE_MOCK) loadAllData(); };

  if (!session) return <LoginScreen onLogin={handleLogin} />;
  if (needsOnboarding && !USE_MOCK)
    return <OnboardingWizard session={session} onComplete={handleOnboardingComplete} />;

  const dataCtx = { patients, episodes, notes, appointments, claims,
    db, token, refreshData, dataLoading, navigate,
    setLivePatients, setLiveEpisodes, setLiveNotes, setLiveAppts, setLiveClaims };

  return (
    <AuthContext.Provider value={{ session }}>
      <DataContext.Provider value={dataCtx}>
        <div style={{ display: "flex", minHeight: "100vh", background: C.bg,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: C.text }}>
          <Sidebar screen={screen} setScreen={setScreen} session={session} onLogout={handleLogout} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <TopBar screen={screen} />
            {dataLoading && (
              <div style={{ background: C.tealLight, borderBottom: `0.5px solid ${C.tealMid}`,
                padding: "4px 1.5rem", fontSize: 12, color: C.teal }}>
                Loading your data...
              </div>
            )}
            <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
              {screen === "dashboard"    && <Dashboard    navigate={navigate} session={session} />}
              {screen === "patients"     && <Patients     navigate={navigate} />}
              {screen === "appointments" && <Appointments navigate={navigate} />}
              {screen === "clinical"     && <ClinicalNote navigate={navigate} />}
              {screen === "episodes"     && <Episodes     navigate={navigate} />}
              {screen === "medicalaid"   && <MedicalAid   navigate={navigate} />}
              {screen === "invoices"     && <Invoices     navigate={navigate} />}
              {screen === "finance"      && <Finance      navigate={navigate} />}
              {screen === "cpd"          && <CPDTracker   session={session} />}
              {screen === "settings"     && <Settings     session={session} />}
            </div>
          </div>
        </div>
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}
