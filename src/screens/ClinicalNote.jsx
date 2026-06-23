import { useContext, useState, useEffect, useRef } from "react";
import { DataContext, C, Card, Btn, Badge } from "../shared.js";
import { PHYSIO_TARIFF_CODES, searchICD10, searchTariffs, USE_MOCK, SUPABASE_ANON } from "../shared.js";

const inp = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`,
  borderRadius: 6, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
const lbl = { fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase",
  letterSpacing: "0.06em", display: "block", marginBottom: 4 };

const BODY_REGIONS = ["Cervical spine","Thoracic spine","Lumbar spine","Shoulder","Elbow",
  "Wrist/Hand","Hip","Knee","Ankle/Foot","Neurological","Cardiopulmonary","Paediatric","Other"];
const MODALITIES = ["TENS/IFC","Ultrasound","Laser","Shockwave","Traction",
  "Hot pack","Cold pack","Dry needling","Hydrotherapy","Pilates rehab","Manual therapy"];

// ── SOAP Macros ───────────────────────────────────────────────────────────────
const SOAP_MACROS = {
  lbp: {
    label: "Low back pain",
    subjective: "Patient reports [X]/10 low back pain, worse with [sitting/bending/lifting]. Onset [acute/chronic]. Radiates to [area] or localised.",
    objective: "ROM: Lumbar flexion [°], extension [°], lateral flexion L/R [°]. SLR [positive/negative] at [°] L/R. Paraspinal muscle spasm [L4–L5 / L5–S1]. Neurological screening: sensation [intact], reflexes [present].",
    assessment: "Lumbar [disc bulge / facet joint dysfunction / muscle strain] at [level]. [Good / Limited] response to previous treatment.",
    plan: "[TENS 20 min / joint mobilisation L4–L5 / soft tissue release]. HEP: McKenzie extension exercises × 3/day. Review in [1 week].",
  },
  shoulder: {
    label: "Shoulder",
    subjective: "Patient reports [X]/10 shoulder pain, [anterior/posterior/lateral]. Onset [acute/insidious]. Limited [abduction/internal rotation/external rotation]. Night pain [present/absent].",
    objective: "ROM: Flexion [°], abduction [°], IR [°], ER [°]. Painful arc [present/absent] at [°]. Neer/Hawkins [positive/negative]. Empty can [positive/negative]. Rotator cuff strength: [grade]/5.",
    assessment: "[Rotator cuff syndrome / subacromial impingement / AC joint pathology / frozen shoulder stage ___].",
    plan: "[Rotator cuff strengthening / glenohumeral mobilisation / ultrasound / dry needling]. HEP: pendulum exercises, IR/ER strengthening band × 3/day.",
  },
  neck: {
    label: "Cervical spine",
    subjective: "Patient reports [X]/10 neck pain [with/without] headache. Onset [acute/postural/MVA]. Radiates to [shoulder/arm/head] or localised. Paraesthesia [present/absent] in [area].",
    objective: "ROM: Flexion [°], extension [°], rotation L/R [°], lateral flexion L/R [°]. Spurling [positive/negative]. ULNT [positive/negative]. Palpation: [facet tenderness / muscle spasm] at [C4–C5 / C5–C6].",
    assessment: "[Cervicogenic headache / cervical facet syndrome / disc bulge at C___/ postural neck pain].",
    plan: "[Cervical mobilisation / manipulation / traction / TENS]. Postural correction advice. HEP: chin tucks, cervical retraction × 10 reps × 3/day.",
  },
  knee: {
    label: "Knee",
    subjective: "Patient reports [X]/10 knee pain [medial/lateral/anterior/diffuse]. Onset [acute injury / insidious]. Swelling [present/absent]. Locking [present/absent]. Giving way [present/absent].",
    objective: "Effusion [present/absent]. ROM: Flexion [°], extension [°/deficit]. McMurray [positive/negative]. Lachman [positive/negative]. Valgus/varus stress [positive/negative]. Quad strength [grade]/5.",
    assessment: "[Patellofemoral pain syndrome / medial meniscus injury / ACL / MCL / IT band syndrome / OA grade ___].",
    plan: "[Quad strengthening / VMO activation / patellar taping / ultrasound / ice]. HEP: straight leg raise, terminal knee extension × 3 sets × 15 reps.",
  },
  ankle: {
    label: "Ankle/Foot",
    subjective: "Patient reports [X]/10 [ankle/foot] pain [lateral/medial/plantar]. Onset [acute inversion/overuse]. Swelling [present/absent]. Weight-bearing [full/partial/non].",
    objective: "Swelling and bruising [present/absent] over [ATFL/CFL/deltoid/plantar fascia]. Ottawa rules [negative — no fracture suspected]. Talar tilt [positive/negative]. Anterior drawer [positive/negative]. Single leg heel raise [present/absent].",
    assessment: "[Grade I/II/III lateral ankle sprain / plantar fasciitis / Achilles tendinopathy / peroneal tendinopathy].",
    plan: "[RICE / TENS / joint mobilisation / eccentric calf strengthening]. HEP: alphabet exercises, calf raises, proprioception work.",
  },
  neuro: {
    label: "Neurological rehab",
    subjective: "Patient with [CVA/TBI/MS/Parkinson's] presents for [initial / session ___] neurological rehabilitation. Functional limitation: [mobility / UL function / balance / speech].",
    objective: "Tone: [normal/increased/decreased] in [UL/LL]. ROM: [within/outside] functional range. Sensation: [intact/impaired] to light touch and proprioception. Balance: [Berg Balance Scale ___/56]. Gait: [independent/requires aid].",
    assessment: "[Hemiplegia / ataxia / spasticity] following [CVA R/L / TBI]. [Good/Moderate/Poor] rehabilitation potential.",
    plan: "[NDT/Bobath facilitation / balance training / functional mobility / FES]. HEP with family/carer education.",
  },
  paeds: {
    label: "Paediatric",
    subjective: "Child aged [___] presents with [condition]. Parent reports [symptoms]. Onset [___]. Development: [age-appropriate / delayed in ___]. School/activity participation [affected/unaffected].",
    objective: "Observation: [posture / gait / movement quality]. Tone: [normal/hypo/hypertonic]. ROM: [within/outside] normal for age. Developmental milestones: [achieved/delayed].",
    assessment: "[Developmental delay / CP / torticollis / Perthes / scoliosis / sports injury].",
    plan: "[NDT / sensory integration / strengthening / stretching / orthotic referral]. Parent HEP education provided.",
  },
  postop: {
    label: "Post-operative",
    subjective: "Patient [X] weeks post [procedure] on [date]. Wound [healed/healing]. Pain [X]/10 at rest, [X]/10 with activity. Swelling [present/absent]. Compliance with precautions [good/fair].",
    objective: "Wound: [healed / healing well]. ROM: [°] vs expected [°] at this stage. Muscle strength: [grade]/5. Gait: [normal / antalgic / with aid]. Protocol stage: [___].",
    assessment: "[On track / slightly behind / ahead of] post-operative rehabilitation protocol at [X] weeks.",
    plan: "Progress to [protocol stage ___]: [exercises / weight-bearing status / ROM targets]. Next milestone: [date / target].",
  },
};

// ── Voice-to-SOAP ─────────────────────────────────────────────────────────────
const VoiceSOAP = ({ note, patient, episode, onResult, onClose }) => {
  const [status,     setStatus]     = useState("idle"); // idle | recording | processing | done | error
  const [transcript, setTranscript] = useState("");
  const [generated,  setGenerated]  = useState(null);
  const [error,      setError]      = useState("");
  const recognitionRef = useRef(null);

  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Speech recognition not supported in this browser. Use Chrome.");
      setStatus("error"); return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous    = true;
    rec.interimResults = true;
    rec.lang          = "en-ZA";
    let final = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setTranscript(final + interim);
    };
    rec.onerror = (e) => { setError(`Recording error: ${e.error}`); setStatus("error"); };
    rec.onend   = () => { if (status === "recording") setStatus("idle"); };
    recognitionRef.current = rec;
    rec.start();
    setStatus("recording");
  };

  const stopAndGenerate = async () => {
    recognitionRef.current?.stop();
    setStatus("processing");
    if (!transcript.trim()) { setError("No speech recorded."); setStatus("error"); return; }

    const context = [
      patient ? `Patient: ${patient.first_name} ${patient.last_name}` : "",
      episode ? `Diagnosis: ${episode.diagnosis} (${episode.icd10_primary})` : "",
      episode ? `Session ${(episode.sessions_completed || 0) + 1} of ${episode.sessions_authorised || "ongoing"}` : "",
      note.body_regions?.length ? `Body regions: ${note.body_regions.join(", ")}` : "",
      note.modalities?.length   ? `Modalities used: ${note.modalities.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const prompt = `You are a South African physiotherapist writing clinical SOAP notes. Generate a structured SOAP note from the voice transcript below.

Context:
${context}

Voice transcript:
"${transcript}"

Return ONLY a JSON object with these exact keys: subjective, objective, assessment, plan
- Each value is a clinical paragraph in the style of a South African physiotherapist
- Use specific measurements, grades, and clinical terminology
- Do not include section headers like "S:" in the values
- Return valid JSON only, no markdown, no explanation`;

    try {
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setGenerated(parsed);
      setStatus("done");
    } catch (e) {
      setError(`AI generation failed: ${e.message}`);
      setStatus("error");
    }
  };

  const applyGenerated = () => {
    onResult(generated);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 540,
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.teal }}>🎤 Voice-to-SOAP</div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
              Dictate your note — AI writes the SOAP
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none",
            fontSize: 20, cursor: "pointer", color: C.textSub }}>×</button>
        </div>

        <div style={{ padding: "1.5rem" }}>
          {/* Recording controls */}
          {(status === "idle" || status === "recording") && (
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: "1rem" }}>
                {status === "recording" ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 10,
                    padding: "10px 20px", background: "#FEE2E2", borderRadius: 30 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%",
                      background: "#EF4444", animation: "pulse 1s infinite" }} />
                    <span style={{ color: "#991B1B", fontWeight: 600, fontSize: 14 }}>Recording...</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: C.textSub, marginBottom: 12 }}>
                    Press record and dictate your clinical findings naturally.<br/>
                    Speak as you would to a colleague — AI will format it as SOAP.
                  </div>
                )}
              </div>

              {transcript && (
                <div style={{ textAlign: "left", background: C.bgSub, borderRadius: 8,
                  padding: "12px", fontSize: 13, color: C.text, marginBottom: "1rem",
                  maxHeight: 150, overflowY: "auto", lineHeight: 1.6 }}>
                  {transcript}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {status === "idle" ? (
                  <Btn onClick={startRecording} style={{ padding: "10px 28px", fontSize: 14 }}>
                    🎤 Start recording
                  </Btn>
                ) : (
                  <Btn onClick={stopAndGenerate} style={{ background: "#EF4444", padding: "10px 28px", fontSize: 14 }}>
                    ⏹ Stop &amp; generate SOAP
                  </Btn>
                )}
                {status === "idle" && transcript && (
                  <Btn onClick={stopAndGenerate} variant="secondary">
                    Generate from transcript
                  </Btn>
                )}
              </div>
            </div>
          )}

          {status === "processing" && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 600, color: C.teal }}>Writing your SOAP note...</div>
              <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>Usually takes 3–5 seconds</div>
            </div>
          )}

          {status === "error" && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{ color: C.red, marginBottom: 12 }}>{error}</div>
              <Btn onClick={() => { setStatus("idle"); setError(""); }}>Try again</Btn>
            </div>
          )}

          {status === "done" && generated && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.teal, marginBottom: 12 }}>
                ✅ SOAP generated — review and apply
              </div>
              {["subjective","objective","assessment","plan"].map(key => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub,
                    textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{key}</div>
                  <textarea
                    value={generated[key] || ""}
                    onChange={e => setGenerated(g => ({ ...g, [key]: e.target.value }))}
                    rows={3}
                    style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`,
                      borderRadius: 6, fontSize: 13, resize: "vertical",
                      fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <Btn variant="secondary" onClick={() => setStatus("idle")}>Re-record</Btn>
                <Btn onClick={applyGenerated}>Apply to note →</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Discharge summary generator ───────────────────────────────────────────────
const DischargeModal = ({ note, patient, onClose }) => {
  const [text,   setText]   = useState("");
  const [status, setStatus] = useState("idle"); // idle | generating | done | error
  const [error,  setError]  = useState("");

  const generate = async () => {
    if (!note.assessment && !note.plan) {
      setError("Assessment and plan are required to generate discharge summary."); return;
    }
    setStatus("generating");
    const prompt = `You are a South African physiotherapist writing a discharge letter for a patient's GP/referring doctor.

Patient: ${patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}
Assessment: ${note.assessment}
Plan / final session: ${note.plan}
Body regions treated: ${(note.body_regions || []).join(", ") || "not specified"}
Modalities used: ${(note.modalities || []).join(", ") || "not specified"}

Write a professional discharge summary letter addressed to the referring doctor. Include:
1. Presenting complaint and diagnosis
2. Treatment course summary (what was done)
3. Patient progress and outcome
4. Home exercise programme given
5. Recommendations / when to return if needed

Write in formal but clear English suitable for a South African medical context. About 200 words.`;

    try {
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      setText(data.content?.[0]?.text || "");
      setStatus("done");
    } catch (e) {
      setError(`Generation failed: ${e.message}`);
      setStatus("error");
    }
  };

  const print = () => {
    const w = window.open("", "_blank");
    const ptName = patient ? `${patient.first_name} ${patient.last_name}` : "Patient";
    w.document.write(`<html><body style="font-family:Arial,sans-serif;max-width:700px;margin:2rem auto;font-size:14px;line-height:1.7">
      <h2 style="color:#0F6E56">Discharge Summary</h2>
      <p><strong>Patient:</strong> ${ptName}</p>
      <p><strong>Date:</strong> ${note.note_date || new Date().toLocaleDateString("en-ZA")}</p>
      <hr/>
      <p>${text.replace(/\n/g, "<br/>")}</p>
      </body></html>`);
    w.print();
  };

  useEffect(() => { generate(); }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.teal }}>📋 Discharge summary</div>
          <button onClick={onClose} style={{ background: "none", border: "none",
            fontSize: 20, cursor: "pointer", color: C.textSub }}>×</button>
        </div>
        <div style={{ padding: "1.5rem" }}>
          {status === "generating" && (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✍️</div>
              <div style={{ color: C.teal, fontWeight: 600 }}>Writing discharge summary...</div>
            </div>
          )}
          {status === "error" && (
            <div>
              <div style={{ color: C.red, marginBottom: 12 }}>{error}</div>
              <Btn onClick={generate}>Retry</Btn>
            </div>
          )}
          {status === "done" && (
            <div>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={14}
                style={{ width: "100%", padding: "10px", border: `1px solid ${C.border}`,
                  borderRadius: 8, fontSize: 13, lineHeight: 1.7, resize: "vertical",
                  fontFamily: "inherit", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                <Btn variant="secondary" onClick={() => navigator.clipboard.writeText(text)}>Copy</Btn>
                <Btn variant="secondary" onClick={print}>Print / PDF</Btn>
                <Btn onClick={onClose}>Done</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Sign & Finalise Modal ─────────────────────────────────────────────────────
const SignModal = ({ note, patient, episode, practitionerId, db, onSigned, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const selectedTariffs = PHYSIO_TARIFF_CODES.filter(t => note.tariff_codes.includes(t.code));
  const total = selectedTariffs.reduce((s, t) => s + t.unit_amount, 0);

  const sign = async () => {
    if (!note.assessment) { setError("Assessment is required before signing."); return; }
    setSaving(true); setError("");
    const signedAt = new Date().toISOString();

    if (USE_MOCK) {
      onSigned({ ...note, signed: true, signed_at: signedAt, id: `mock_note_${Date.now()}` });
      return;
    }
    if (!practitionerId) { setError("Practitioner record not loaded."); setSaving(false); return; }

    const notePayload = {
      practitioner_id: practitionerId,
      patient_id:    note.patient_id,
      episode_id:    note.episode_id || null,
      note_date:     note.note_date,
      subjective:    note.subjective || null,
      objective:     note.objective  || null,
      assessment:    note.assessment,
      plan:          note.plan       || null,
      body_regions:  note.body_regions.length ? note.body_regions : null,
      modalities:    note.modalities.length   ? note.modalities   : null,
      tariff_codes:  note.tariff_codes.length ? note.tariff_codes : null,
      icd10_primary: note.icd10_primary || null,
      signed: true, signed_at: signedAt, ai_generated: note.ai_generated || false,
    };
    const { data: noteData, error: noteErr } = await db.from("clinical_note").insert(notePayload);
    if (noteErr || !noteData?.[0]) {
      setError(`Failed to save note: ${noteErr?.message || JSON.stringify(noteErr)}`);
      setSaving(false); return;
    }
    const savedNoteId = noteData[0].id;

    // Save signed note to localStorage for voice style model
    try {
      const signed = JSON.parse(localStorage.getItem("ph_signed_notes") || "[]");
      signed.unshift({ subjective: note.subjective, objective: note.objective,
        assessment: note.assessment, plan: note.plan, date: note.note_date });
      localStorage.setItem("ph_signed_notes", JSON.stringify(signed.slice(0, 10)));
    } catch {}

    const claimErrors = [];
    for (const tariff of selectedTariffs) {
      if (!note.icd10_primary) continue;
      const { error: claimErr } = await db.from("medical_aid_claim").insert({
        practitioner_id: practitionerId,
        patient_id:    note.patient_id,
        episode_id:    note.episode_id || null,
        note_id:       savedNoteId,
        claim_date:    note.note_date,
        scheme_code:   patient?.medical_aid_id ? patient.medical_aid_id.toUpperCase().slice(0,4) : null,
        member_number: patient?.medical_aid_number || null,
        dependant_code: patient?.dependant_code || "00",
        tariff_code:   tariff.code,
        icd10_code:    note.icd10_primary,
        description:   tariff.description,
        quantity: 1, unit_amount: tariff.unit_amount, total_amount: tariff.unit_amount,
        status: patient?.medical_aid_id ? "ready" : "draft",
        switch: "manual",
      });
      if (claimErr) claimErrors.push(tariff.code);
    }

    if (claimErrors.length) {
      setError(`Note saved but claims failed for: ${claimErrors.join(", ")}.`);
      setSaving(false); return;
    }
    onSigned({ ...noteData[0] });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 460,
        boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.teal }}>Sign & finalise note</div>
          <button onClick={onClose} style={{ background: "none", border: "none",
            fontSize: 20, cursor: "pointer", color: C.textSub }}>×</button>
        </div>
        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: 12 }}>
          {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA",
            borderRadius: 6, padding: "8px 12px", fontSize: 12, color: C.red }}>{error}</div>}
          <Card style={{ background: C.tealLight }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 8 }}>Note summary</div>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
              <div><strong>Date:</strong> {note.note_date}</div>
              {note.icd10_primary && <div><strong>ICD-10:</strong> {note.icd10_primary}</div>}
              {note.body_regions.length > 0 && <div><strong>Regions:</strong> {note.body_regions.join(", ")}</div>}
              {note.ai_generated && <div style={{ color: C.teal }}>⚡ AI-assisted note</div>}
            </div>
          </Card>
          {selectedTariffs.length > 0 ? (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 8 }}>
                Claims to generate ({selectedTariffs.length})
              </div>
              {selectedTariffs.map(t => (
                <div key={t.code} style={{ display: "flex", justifyContent: "space-between",
                  fontSize: 13, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span><strong>{t.code}</strong> — {t.description}</span>
                  <span style={{ color: C.teal, fontWeight: 600 }}>R{t.unit_amount.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between",
                fontWeight: 700, paddingTop: 8, marginTop: 4 }}>
                <span>Total (100% NHRPL)</span>
                <span style={{ color: C.teal }}>R{total.toFixed(2)}</span>
              </div>
              {!note.icd10_primary && (
                <div style={{ marginTop: 8, fontSize: 12, color: C.amber }}>
                  ⚠ No ICD-10 — claims won't be generated without one
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <div style={{ fontSize: 13, color: C.textSub }}>
                No tariff codes selected — note will be signed with no claims generated.
              </div>
            </Card>
          )}
        </div>
        <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={sign} disabled={saving}>
            {saving ? "Signing..." : "Sign & generate claims"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ── Macro picker ──────────────────────────────────────────────────────────────
const MacroPicker = ({ onSelect, onClose }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
    <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: "100%",
      maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.teal }}>Quick templates</div>
        <button onClick={onClose} style={{ background: "none", border: "none",
          fontSize: 18, cursor: "pointer", color: C.textSub }}>×</button>
      </div>
      <div style={{ fontSize: 12, color: C.textSub, marginBottom: 12 }}>
        Select a template to pre-fill the SOAP fields. Edit freely after.
      </div>
      {Object.entries(SOAP_MACROS).map(([key, macro]) => (
        <div key={key} onClick={() => { onSelect(macro); onClose(); }}
          style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6,
            border: `1px solid ${C.border}`, cursor: "pointer", fontSize: 13 }}
          onMouseEnter={e => { e.currentTarget.style.background = C.tealLight; e.currentTarget.style.borderColor = C.teal; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = C.border; }}>
          <div style={{ fontWeight: 600, color: C.teal }}>/{key}</div>
          <div style={{ color: C.textSub, fontSize: 12 }}>{macro.label}</div>
        </div>
      ))}
    </div>
  </div>
);

// ── Main ClinicalNote screen ──────────────────────────────────────────────────
export const ClinicalNote = ({ navigate }) => {
  const { patients, episodes, db, practitionerId, setLiveNotes, setLiveClaims } = useContext(DataContext);

  const EMPTY_NOTE = {
    patient_id: "", episode_id: "",
    note_date: new Date().toISOString().split("T")[0],
    subjective: "", objective: "", assessment: "", plan: "",
    body_regions: [], modalities: [],
    tariff_codes: [], icd10_primary: "",
    signed: false, ai_generated: false,
  };

  const [note,         setNote]         = useState(EMPTY_NOTE);
  const [tab,          setTab]          = useState("soap");
  const [tariffSearch, setTariffSearch] = useState("");
  const [icd10Search,  setIcd10Search]  = useState("");
  const [showSign,     setShowSign]     = useState(false);
  const [showVoice,    setShowVoice]    = useState(false);
  const [showMacros,   setShowMacros]   = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [signedNote,   setSignedNote]   = useState(null);

  const set    = (k, v) => setNote(n => ({ ...n, [k]: v }));
  const toggle = (k, val) => setNote(n => ({
    ...n, [k]: n[k].includes(val) ? n[k].filter(x => x !== val) : [...n[k], val]
  }));

  // Shortcode expansion — type /lbp, /shoulder etc in any field
  const handleFieldChange = (key, value) => {
    const match = value.match(/\/(\w+)$/);
    if (match) {
      const macro = SOAP_MACROS[match[1]];
      if (macro) {
        setNote(n => ({ ...n,
          subjective: macro.subjective, objective: macro.objective,
          assessment: macro.assessment, plan: macro.plan,
        }));
        return;
      }
    }
    set(key, value);
  };

  const tariffResults   = tariffSearch.length > 1 ? searchTariffs(tariffSearch).slice(0, 8) : [];
  const icd10Results    = icd10Search.length > 1  ? searchICD10(icd10Search).slice(0, 8)    : [];
  const selectedTariffs = PHYSIO_TARIFF_CODES.filter(t => note.tariff_codes.includes(t.code));
  const totalAmount     = selectedTariffs.reduce((s, t) => s + t.unit_amount, 0);
  const ptEpisodes      = note.patient_id ? episodes.filter(e => e.patient_id === note.patient_id && e.status === "active") : [];
  const selectedPatient = patients.find(p => p.id === note.patient_id);

  const handleVoiceResult = (soap) => {
    setNote(n => ({ ...n, ...soap, ai_generated: true }));
    setTab("soap");
  };

  const handleMacro = (macro) => {
    setNote(n => ({ ...n, subjective: macro.subjective, objective: macro.objective,
      assessment: macro.assessment, plan: macro.plan }));
  };

  const handleSigned = (saved) => {
    setSignedNote(saved);
    setShowSign(false);
    if (saved.id) setLiveNotes?.(prev => prev ? [saved, ...prev] : [saved]);
  };

  const startNew = () => { setNote(EMPTY_NOTE); setSignedNote(null); setTab("soap"); };

  const TABS = [
    { id: "soap",       label: "SOAP note" },
    { id: "billing",    label: `Billing${note.tariff_codes.length ? ` (${note.tariff_codes.length})` : ""}` },
    { id: "modalities", label: "Modalities" },
  ];

  // ── Signed confirmation ───────────────────────────────────────────────────
  if (signedNote) {
    const tariffs = PHYSIO_TARIFF_CODES.filter(t => (signedNote.tariff_codes || []).includes(t.code));
    return (
      <div>
        <div style={{ textAlign: "center", padding: "2rem 0 1rem" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: C.teal, marginBottom: 4 }}>Note signed</div>
          <div style={{ color: C.textSub, fontSize: 13 }}>
            {tariffs.length > 0
              ? `${tariffs.length} claim${tariffs.length !== 1 ? "s" : ""} generated — R${tariffs.reduce((s,t)=>s+t.unit_amount,0).toFixed(2)} total`
              : "Note finalised with no claims"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn variant="secondary" onClick={startNew}>+ New note</Btn>
          <Btn variant="secondary" onClick={() => setShowDischarge(true)}>📋 Discharge summary</Btn>
          <Btn onClick={() => navigate("medicalaid")}>View claims →</Btn>
        </div>
        {showDischarge && (
          <DischargeModal note={signedNote} patient={selectedPatient} onClose={() => setShowDischarge(false)} />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, color: C.teal }}>Clinical note</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Btn variant="secondary" size="sm" onClick={() => setShowVoice(true)}>🎤 Voice</Btn>
          <Btn variant="secondary" size="sm" onClick={() => setShowMacros(true)}>⚡ Templates</Btn>
          <Btn onClick={() => { if (!note.patient_id) return; setShowSign(true); }}>
            Sign & finalise
          </Btn>
        </div>
      </div>

      {note.ai_generated && (
        <div style={{ background: C.tealLight, border: `1px solid ${C.tealMid}`, borderRadius: 8,
          padding: "6px 12px", fontSize: 12, color: C.teal, marginBottom: "0.75rem" }}>
          ⚡ AI-assisted — review and edit before signing
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              background: tab === t.id ? C.teal : C.tealLight,
              color: tab === t.id ? "#fff" : C.teal, fontWeight: 600, fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SOAP tab ── */}
      {tab === "soap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px", gap: 10 }}>
            <div>
              <label style={lbl}>Patient *</label>
              <select style={inp} value={note.patient_id}
                onChange={e => { set("patient_id", e.target.value); set("episode_id", ""); }}>
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Episode of care</label>
              <select style={inp} value={note.episode_id} onChange={e => set("episode_id", e.target.value)}
                disabled={!note.patient_id}>
                <option value="">No episode / once-off</option>
                {ptEpisodes.map(e => (
                  <option key={e.id} value={e.id}>{e.diagnosis} ({e.icd10_primary})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Date</label>
              <input type="date" style={inp} value={note.note_date}
                onChange={e => set("note_date", e.target.value)} />
            </div>
          </div>

          {[
            { key: "subjective",  label: "S — Subjective",  placeholder: "Patient's reported symptoms, pain score (e.g. 6/10), aggravating/relieving factors, functional limitations... (or type /lbp, /shoulder, /knee etc for template)" },
            { key: "objective",   label: "O — Objective",   placeholder: "ROM measurements, special test results, palpation findings, neurological screen, strength grades..." },
            { key: "assessment",  label: "A — Assessment",  placeholder: "Clinical diagnosis, problem list, response to treatment, progress towards goals..." },
            { key: "plan",        label: "P — Plan",        placeholder: "Treatment applied today, home exercise programme, next session plan, referral if indicated..." },
          ].map(({ key, label, placeholder }) => (
            <Card key={key} style={{ padding: "0.75rem" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.teal,
                textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
              <textarea value={note[key]} onChange={e => handleFieldChange(key, e.target.value)}
                rows={key === "assessment" ? 3 : 4} placeholder={placeholder}
                style={{ width: "100%", marginTop: 8, padding: 8, border: `1px solid ${C.border}`,
                  borderRadius: 6, fontSize: 13, resize: "vertical",
                  fontFamily: "inherit", boxSizing: "border-box" }} />
            </Card>
          ))}

          <Card style={{ padding: "0.875rem" }}>
            <label style={{ ...lbl, marginBottom: 8 }}>Body regions treated</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {BODY_REGIONS.map(r => (
                <button key={r} onClick={() => toggle("body_regions", r)}
                  style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${C.border}`,
                    cursor: "pointer", fontSize: 12,
                    background: note.body_regions.includes(r) ? C.teal : "#fff",
                    color: note.body_regions.includes(r) ? "#fff" : C.text }}>
                  {r}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Billing tab ── */}
      {tab === "billing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>ICD-10 primary diagnosis</div>
            <div style={{ position: "relative" }}>
              <input style={inp} value={icd10Search || note.icd10_primary}
                onChange={e => setIcd10Search(e.target.value)}
                placeholder="Search — e.g. 'back pain' or 'M54'" />
              {icd10Results.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                  background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto" }}>
                  {icd10Results.map(r => (
                    <div key={r.code} onClick={() => { set("icd10_primary", r.code); setIcd10Search(""); }}
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13,
                        display: "flex", gap: 10, borderBottom: `1px solid ${C.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = C.tealLight}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ color: C.teal, fontWeight: 600, minWidth: 60 }}>{r.code}</span>
                      <span>{r.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {note.icd10_primary && !icd10Search && (
              <div style={{ marginTop: 6, padding: "6px 10px", background: C.tealLight,
                borderRadius: 6, fontSize: 13, color: C.teal, fontWeight: 600 }}>
                ✓ {note.icd10_primary}
              </div>
            )}
          </Card>

          <Card>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Procedure codes (NHRPL)</div>
            <input style={inp} value={tariffSearch} onChange={e => setTariffSearch(e.target.value)}
              placeholder="Search — e.g. 'manipulation' or '18533'" />
            {tariffResults.length > 0 && (
              <div style={{ marginTop: 4, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
                {tariffResults.map(t => (
                  <div key={t.code} onClick={() => { toggle("tariff_codes", t.code); setTariffSearch(""); }}
                    style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13,
                      display: "flex", gap: 10, alignItems: "center",
                      borderBottom: `1px solid ${C.border}`,
                      background: note.tariff_codes.includes(t.code) ? C.tealLight : "transparent" }}>
                    <span style={{ color: C.teal, fontWeight: 600, minWidth: 60 }}>{t.code}</span>
                    <span style={{ flex: 1 }}>{t.description}</span>
                    <span style={{ color: C.textSub }}>R{t.unit_amount.toFixed(2)}</span>
                    {note.tariff_codes.includes(t.code) && <span style={{ color: C.teal }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
            {selectedTariffs.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Selected</div>
                {selectedTariffs.map(t => (
                  <div key={t.code} style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", fontSize: 13, padding: "4px 0" }}>
                    <span style={{ flex: 1 }}>{t.code} — {t.description}</span>
                    <span style={{ color: C.teal, fontWeight: 600, marginLeft: 12 }}>R{t.unit_amount.toFixed(2)}</span>
                    <button onClick={() => toggle("tariff_codes", t.code)}
                      style={{ background: "none", border: "none", cursor: "pointer",
                        color: C.textSub, fontSize: 16, marginLeft: 8 }}>×</button>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700,
                  paddingTop: 8, marginTop: 8, borderTop: `1px solid ${C.border}` }}>
                  <span>Total (100% NHRPL)</span>
                  <span style={{ color: C.teal }}>R{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Modalities tab ── */}
      {tab === "modalities" && (
        <Card>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Modalities used this session</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {MODALITIES.map(m => (
              <button key={m} onClick={() => toggle("modalities", m)}
                style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${C.border}`,
                  cursor: "pointer", fontSize: 13,
                  background: note.modalities.includes(m) ? C.teal : "#fff",
                  color: note.modalities.includes(m) ? "#fff" : C.text }}>
                {m}
              </button>
            ))}
          </div>
        </Card>
      )}

      {showVoice    && <VoiceSOAP note={note} patient={selectedPatient}
        episode={episodes.find(e => e.id === note.episode_id)}
        onResult={handleVoiceResult} onClose={() => setShowVoice(false)} />}
      {showMacros   && <MacroPicker onSelect={handleMacro} onClose={() => setShowMacros(false)} />}
      {showSign     && <SignModal note={note} patient={selectedPatient}
        episode={episodes.find(e => e.id === note.episode_id)}
        practitionerId={practitionerId} db={db}
        onSigned={handleSigned} onClose={() => setShowSign(false)} />}
    </div>
  );
};
