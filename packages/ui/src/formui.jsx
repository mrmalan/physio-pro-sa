import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { Badge, Btn, Card, SectionTitle, StatCard } from "./ui.jsx";
import { C, getStyleExamples, useData } from "@prosa/core";

// OccHealth Pro SA — form UI components
// Field, Input, Select, Textarea
export const Field = ({ label, children, style = {} }) => (
  <div style={{ marginBottom: 10, ...style }}>
    <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTert, marginBottom: 4, fontWeight: 500 }}>{label}</div>
    {children}
  </div>
);

export const Input = ({ value, onChange, placeholder = "", type = "text", style = {} }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff", ...style }} />
);

export const Select = ({ value, onChange, children, style = {} }) => (
  <select value={value} onChange={onChange}
    style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", background: "#fff", outline: "none", ...style }}>
    {children}
  </select>
);

export const Textarea = ({ value, onChange, rows = 3, placeholder = "" }) => (
  <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
    style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.6 }} />
);

// ─── ENCOUNTER DETAIL VIEW ────────────────────────────────────────────────────
// ─── AI LETTERS ───────────────────────────────────────────────────────────────
// Generates referral letters, sick notes, return-to-work certificates
// from a signed encounter's assessment + plan. No clinical hallucination —
// Claude only reformats what the OHP has already written.

const LETTER_TYPES = [
  { value: "referral",   label: "Specialist referral",    icon: "📋" },
  { value: "sick_note",  label: "Sick note",              icon: "🏥" },
  { value: "rtw",        label: "Return-to-work cert",    icon: "✅" },
];

const AILetters = ({ enc, person, employer, session }) => {
  const [generating, setGenerating] = useState(null); // letter type being generated
  const [letters, setLetters] = useState({}); // keyed by letter type
  const [showLetter, setShowLetter] = useState(null);
  const meta = session?.user?.user_metadata || {};

  const generate = async (type) => {
    setGenerating(type);
    try {
      const typeLabel = LETTER_TYPES.find(t => t.value === type)?.label || type;
      const pracName   = enc.signed_by || meta.full_name || "";
      const pracSANC   = meta.sanc_number || "";
      const pracQual   = meta.qualification || "B.Cur OHN";
      const pracAddr   = meta.practice_address || meta.tenant_name || "OccHealth Pro SA";
      const encDate    = enc.encounter_at ? new Date(enc.encounter_at).toLocaleDateString("en-ZA", { day:"2-digit", month:"long", year:"numeric" }) : "";
      const today      = new Date().toLocaleDateString("en-ZA", { day:"2-digit", month:"long", year:"numeric" });

      const contextLines = [
        `Patient full name: ${person?.first_name || ""} ${person?.last_name || ""}`,
        `Patient ID number: ${person?.id_number || "not provided"}`,
        `Employee number: ${person?.employee_number || "not provided"}`,
        `Date of birth: ${person?.date_of_birth || "not provided"}`,
        `Occupation / job title: ${person?.job_title || "not provided"}`,
        `Employer: ${employer?.name || "not provided"}`,
        `Encounter date: ${encDate}`,
        `Encounter type: ${enc.encounter_type?.replace(/_/g," ") || ""}`,
        enc.subjective ? `Subjective: ${enc.subjective}` : "",
        enc.objective  ? `Objective: ${enc.objective}`  : "",
        enc.assessment ? `Assessment: ${enc.assessment}` : "",
        enc.plan       ? `Plan: ${enc.plan}`             : "",
        `Practitioner name: ${pracName}`,
        `Practitioner qualification: ${pracQual}`,
        `SANC registration number: ${pracSANC}`,
        `Practice / address: ${pracAddr}`,
        `Date of issue: ${today}`,
      ].filter(Boolean).join("\n");

      const typeInstruction = {
        referral: `Write a specialist referral letter on behalf of the occupational health practitioner. Include:
- Practitioner name, qualification, SANC number, practice address, date
- Patient name, ID number, date of birth, occupation, employer
- Reason for referral and specific clinical question
- Relevant clinical summary (from assessment and plan only — do not add information not in the notes)
- Specific request to the specialist
Output plain text only. No markdown. No asterisks.`,

        sick_note: `Write a medical certificate of illness/incapacity compliant with BCEA Section 23(2) and the Medical and Dental Professions Board Rule 15. The certificate must include ALL of the following elements in this order:

1. Practitioner name, full address/practice, qualification, and SANC registration number (header)
2. Date of issue
3. Patient full name, ID number, employee number (if provided), date of birth
4. Employer name and occupation
5. That the certificate is issued based on personal examination of the patient on the encounter date
6. A description of the condition in layman's terms (based on assessment — do not fabricate or add clinical detail not in the notes; if assessment is vague, use the encounter type)
7. Whether the patient is totally unfit OR fit for light/modified duties only (infer from plan if stated, otherwise state totally unfit)
8. The exact recommended period of sick leave: from encounter date, duration from plan if stated, otherwise leave blank with "[FROM] to [TO] — complete as appropriate"
9. Expected return-to-work date (if determinable from plan)
10. Legal authority line: "Issued in terms of BCEA Section 23(2) by a registered nursing practitioner registered with the South African Nursing Council."
11. Signature block: practitioner name in full (printed), signature line, SANC number, date, qualification

Keep it formal and concise. Output plain text only. No markdown. No asterisks.`,

        rtw: `Write a return-to-work certificate on behalf of the occupational health practitioner. Include:
- Practitioner name, qualification, SANC number, practice address, date of issue
- Patient full name, ID number, employee number, occupation, employer
- Statement that the patient was examined on the encounter date and is now fit to return to work
- Any restrictions or modifications required (from plan — if none stated, declare fully fit)
- Effective date of return to work
- Legal authority: "Issued in terms of BCEA Section 23(2) by a registered nursing practitioner registered with the South African Nursing Council."
- Signature block with SANC number
Output plain text only. No markdown. No asterisks.`,
      }[type] || "";

      const systemPrompt = `You are an occupational health practitioner assistant generating legally compliant South African medical certificates and letters. Generate ONLY what is supported by the clinical notes provided. Do NOT add, invent, or infer clinical information not explicitly present in the notes. Output plain text only — no markdown formatting, no asterisks, no bullet points in the document body.`;

      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: "user", content: `${typeInstruction}\n\nClinical context:\n${contextLines}` }],
          max_tokens: 800,
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      setLetters(prev => ({ ...prev, [type]: text }));
      setShowLetter(type);
    } catch(e) {
      console.error("Letter generation error:", e);
      alert("Failed to generate letter: " + e.message);
    }
    setGenerating(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <SectionTitle>AI letters</SectionTitle>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem" }}>
        {LETTER_TYPES.map(t => (
          <Btn key={t.value} size="sm" variant="secondary" onClick={() => generate(t.value)} disabled={!!generating}>
            {generating === t.value ? "Generating..." : `${t.icon} ${t.label}`}
          </Btn>
        ))}
      </div>

      {showLetter && letters[showLetter] && (
        <Card style={{ border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {LETTER_TYPES.map(t => (
                <button key={t.value} onClick={() => setShowLetter(letters[t.value] ? t.value : showLetter)}
                  style={{ fontSize: 12, padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border}`,
                    background: showLetter === t.value ? C.teal : C.bgSub, color: showLetter === t.value ? "#fff" : C.textSub,
                    cursor: letters[t.value] ? "pointer" : "not-allowed", opacity: letters[t.value] ? 1 : 0.4 }}>
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn size="sm" variant="secondary" onClick={() => copyToClipboard(letters[showLetter])}>Copy</Btn>
              <Btn size="sm" variant="ghost" onClick={() => {
                const w = window.open("", "_blank");
                w.document.write(`<pre style="font-family:Georgia,serif;font-size:14px;line-height:1.8;padding:2rem;max-width:700px;margin:auto">${letters[showLetter]}</pre>`);
                w.print();
              }}>Print</Btn>
            </div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", color: C.text, fontFamily: "Georgia, serif", background: C.bgSub, padding: "1rem", borderRadius: 6 }}>
            {letters[showLetter]}
          </div>
        </Card>
      )}
    </div>
  );
};

export const EncounterDetail = ({ enc, onBack, session }) => {
  const { persons, employers, fitnessCerts } = useData();
  const person = persons.find(p => p.id === enc.person_id);
  const employer = employers.find(e => e.id === enc.employer_id);
  const fc = fitnessCerts.find(f => f.encounter_id === enc.id);
  const [printing, setPrinting] = useState(false);

  const printCert = async () => {
    if (!fc) return;
    setPrinting(true);
    try {
      const meta = session?.user?.user_metadata || {};
      const payload = {
        cert_id: fc.id,
        practice_name: meta.tenant_name || "OccHealth Pro SA",
        person_name: person ? `${person.first_name} ${person.last_name}` : "",
        employee_number: person?.employee_number || "",
        employer_name: employer?.name || "",
        role_category: fc.role_category || person?.job_title || "",
        date_of_birth: person?.date_of_birth || "",
        site: enc.site || employer?.name || "",
        fitness_status: fc.fitness_status,
        restrictions: fc.restrictions || [],
        valid_from: fc.valid_from,
        valid_until: fc.valid_until,
        validity_period: (() => {
          if (!fc.valid_from || !fc.valid_until) return "12 months";
          const months = Math.round((new Date(fc.valid_until) - new Date(fc.valid_from)) / (1000 * 60 * 60 * 24 * 30));
          return `${months} months`;
        })(),
        notes: fc.notes || enc.assessment || "",
        practitioner_name: enc.signed_by || meta.full_name || "",
        qualification: meta.qualification || "",
        sanc_number: meta.sanc_number || "",
        signed_at: fc.valid_from,
      };
      const res = await fetch("/.netlify/functions/fitness-cert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch(e) {
      alert("Failed to generate certificate: " + e.message);
    }
    setPrinting(false);
  };
  return (
    <div>
      <Btn variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: "1rem" }}>← Back</Btn>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{person?.first_name} {person?.last_name}</div>
          <div style={{ fontSize: 13, color: C.textSub }}>{employer?.name} · {enc.encounter_type.replace(/_/g," ")}</div>
          <div style={{ fontSize: 11, color: C.textTert }}>{new Date(enc.encounter_at).toLocaleString("en-ZA")}</div>
        </div>
        <Badge color={enc.signed_at ? "teal" : "amber"}>{enc.signed_at ? "Signed" : "Draft"}</Badge>
      </div>
      {enc.vitals && (
        <>
          <SectionTitle>Vitals</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: "1rem" }}>
            {enc.vitals.bp_systolic && <StatCard label="Blood pressure" value={`${enc.vitals.bp_systolic}/${enc.vitals.bp_diastolic}`} sub="mmHg" />}
            {enc.vitals.hr && <StatCard label="Heart rate" value={enc.vitals.hr} sub="bpm" />}
            {enc.vitals.weight && <StatCard label="Weight" value={`${enc.vitals.weight}kg`} />}
            {enc.vitals.height && <StatCard label="Height" value={`${enc.vitals.height}cm`} />}
            {enc.vitals.bmi && <StatCard label="BMI" value={enc.vitals.bmi} color={enc.vitals.bmi > 30 ? C.amber : C.teal} />}
            {enc.vitals.temp && <StatCard label="Temp" value={`${enc.vitals.temp}°C`} />}
          </div>
        </>
      )}
      <SectionTitle>Clinical notes</SectionTitle>
      {[
        { label: "Subjective (S)", value: enc.subjective },
        { label: "Objective (O)", value: enc.objective },
        { label: "Assessment (A)", value: enc.assessment },
        { label: "Plan (P)", value: enc.plan },
      ].filter(f => f.value).map(f => (
        <Card key={f.label} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textTert, marginBottom: 4 }}>{f.label}</div>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: C.text }}>{f.value}</div>
        </Card>
      ))}
      {enc.signed_at && (
        <div style={{ fontSize: 12, color: C.textSub, marginTop: 8 }}>
          Signed by <strong>{enc.signed_by}</strong> on {new Date(enc.signed_at).toLocaleString("en-ZA")}
          {enc.ai_generated && <span style={{ marginLeft: 8 }}><Badge color="gray">AI-assisted</Badge></span>}
        </div>
      )}

      {/* AI letters — only on signed encounters with assessment/plan */}
      {enc.signed_at && (enc.assessment || enc.plan) && (
        <AILetters enc={enc} person={person} employer={employer} session={session} />
      )}

      {fc && (
        <>
          <SectionTitle style={{ marginTop: "1rem" }}>Fitness certificate</SectionTitle>
          <Card style={{ border: `1px solid ${C.tealMid}`, background: C.tealLight }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.tealDark }}>{fc.fitness_status.replace(/_/g," ").toUpperCase()}</div>
                <div style={{ fontSize: 12, color: C.teal }}>Valid: {new Date(fc.valid_from).toLocaleDateString("en-ZA")} – {new Date(fc.valid_until).toLocaleDateString("en-ZA")}</div>
                {fc.restrictions?.length > 0 && <div style={{ fontSize: 12, color: C.teal, marginTop: 2 }}>Restrictions: {fc.restrictions.join(", ")}</div>}
              </div>
              <Btn size="sm" variant="ghost" onClick={printCert} disabled={printing} style={{ borderColor: C.teal, color: C.teal }}>{printing ? "Generating..." : "Print cert"}</Btn>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

// ─── SIGN MODAL ───────────────────────────────────────────────────────────────
export const SignModal = ({ form, person, onConfirm, onCancel, session }) => {
  const [fcEnabled, setFcEnabled] = useState(["pre_employment","periodic","exit","surveillance"].includes(form.encounter_type));
  const [fcStatus, setFcStatus] = useState("fit");
  const [fcRestrictions, setFcRestrictions] = useState("");
  const [fcMonths, setFcMonths] = useState(12);
  const [signing, setSigning] = useState(false);

  const handleSign = async () => {
    setSigning(true);
    const now = new Date().toISOString();
    const validFrom = now.slice(0,10);
    const validUntil = new Date(Date.now() + fcMonths * 30 * 86400000).toISOString().slice(0,10);
    const fc = fcEnabled ? {
      fitness_status: fcStatus,
      restrictions: fcRestrictions ? fcRestrictions.split(",").map(s => s.trim()).filter(Boolean) : [],
      valid_from: validFrom,
      valid_until: validUntil,
      role_category: person?.job_title || "",
    } : null;
    await onConfirm(now, fc);
    setSigning(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: "100%", maxWidth: 480 }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Sign & finalise encounter</div>
        <div style={{ fontSize: 13, color: C.textSub, marginBottom: "1.25rem" }}>
          {person?.first_name} {person?.last_name} · {form.encounter_type.replace(/_/g," ")}
        </div>
        <div style={{ background: C.amberLight, border: `1px solid #E8C56A`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: C.amber, marginBottom: "1.25rem" }}>
          ⚠ Once signed this record is locked and cannot be edited. Corrections require a new encounter.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
          <input type="checkbox" id="fc-toggle" checked={fcEnabled} onChange={e => setFcEnabled(e.target.checked)} style={{ width: 16, height: 16 }} />
          <label htmlFor="fc-toggle" style={{ fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Issue fitness certificate</label>
        </div>
        {fcEnabled && (
          <div style={{ background: C.bgSub, borderRadius: 8, padding: "1rem", marginBottom: "1rem" }}>
            <Field label="Fitness status">
              <Select value={fcStatus} onChange={e => setFcStatus(e.target.value)}>
                <option value="fit">Fit</option>
                <option value="fit_with_restrictions">Fit with restrictions</option>
                <option value="temporarily_unfit">Temporarily unfit</option>
                <option value="permanently_unfit">Permanently unfit</option>
              </Select>
            </Field>
            {fcStatus === "fit_with_restrictions" && (
              <Field label="Restrictions (comma-separated)">
                <Input value={fcRestrictions} onChange={e => setFcRestrictions(e.target.value)} placeholder="No heights, Limited lifting..." />
              </Field>
            )}
            <Field label="Valid for (months)">
              <Select value={fcMonths} onChange={e => setFcMonths(Number(e.target.value))}>
                {[3,6,9,12,18,24].map(m => <option key={m} value={m}>{m} months</option>)}
              </Select>
            </Field>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={onCancel} disabled={signing}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSign} disabled={signing}>
            {signing ? "Signing..." : "Sign & finalise"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ─── VOICE TO NOTE ────────────────────────────────────────────────────────────
export const useVoiceToNote = (onResult, context = {}) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [generating, setGenerating] = useState(false);
  const recRef = useRef(null);

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported in this browser"); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-ZA";
    rec.onresult = e => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(" ");
      setTranscript(t);
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  const stop = async () => {
    recRef.current?.stop();
    setListening(false);
    if (!transcript) return;
    setGenerating(true);
    try {
      const styleExamples = getStyleExamples();

      // Build rich context string from person/employer/encounter data
      const ctx = [];
      if (context.encounterType) ctx.push(`Encounter type: ${context.encounterType.replace(/_/g, " ")}`);
      if (context.personName) ctx.push(`Patient: ${context.personName}`);
      if (context.jobTitle) ctx.push(`Occupation: ${context.jobTitle}`);
      if (context.employer) ctx.push(`Employer: ${context.employer}`);
      if (context.hazardProfiles?.length) ctx.push(`Hazard exposures: ${context.hazardProfiles.join(", ")}`);
      if (context.vitals?.bp_systolic) ctx.push(`BP: ${context.vitals.bp_systolic}/${context.vitals.bp_diastolic} mmHg`);
      if (context.vitals?.hr) ctx.push(`HR: ${context.vitals.hr} bpm`);
      if (context.vitals?.weight) ctx.push(`Weight: ${context.vitals.weight} kg`);
      const contextStr = ctx.length ? `\n\nPatient context:\n${ctx.join("\n")}` : "";

      const styleSection = styleExamples
        ? `\n\nHere are examples of this practitioner's writing style (match it precisely):\n\n${styleExamples}`
        : "";

      const systemPrompt = `You are an occupational health clinical note assistant for South Africa. Generate structured SOAP notes from voice transcripts. Write concisely in the style of an experienced occupational health practitioner. Use standard SA OHP terminology. Do not fabricate clinical findings — only include what is in the transcript.${styleSection} Respond ONLY with JSON: {"subjective":"...","objective":"...","assessment":"...","plan":"..."}`;

      const userMsg = `Generate a SOAP note from this voice transcript.${contextStr}\n\nTranscript: ${transcript}`;

      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: "user", content: userMsg }],
          max_tokens: 800,
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      onResult(parsed);
    } catch(e) {
      console.error("Voice-to-note error:", e);
    }
    setGenerating(false);
    setTranscript("");
  };

  return { listening, transcript, generating, start, stop };
};

// ─── ENCOUNTERS SCREEN ────────────────────────────────────────────────────────
