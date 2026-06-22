// OccHealth Pro SA — Supabase client factory, offline queue, auth helpers
import { SUPABASE_URL, SUPABASE_ANON, USE_MOCK } from "./config.js";
export const makeClient = (getHeaders) => {
  const client = {
    from: (table) => {
      // Builder state
      let _method = "GET";
      let _body = null;
      let _filters = [];   // ["col=eq.val", ...]
      let _order = null;   // "col.asc" | "col.desc"
      let _limit = null;
      let _wantReturn = false;
      let _upsertConflict = null;

      const buildQS = () => {
        const parts = [..._filters];
        if (_order) parts.push(`order=${_order}`);
        if (_limit) parts.push(`limit=${_limit}`);
        return parts.length ? `?${parts.join("&")}` : "";
      };

      const execute = async () => {
        if (USE_MOCK) {
          if (_method === "POST" || _method === "PATCH") {
            const row = typeof _body === "string" ? JSON.parse(_body) : _body;
            if (Array.isArray(row)) return { data: row.map(r => ({ ...r, id: r.id || crypto.randomUUID() })), error: null };
            return { data: [{ ...row, id: row.id || crypto.randomUUID() }], error: null };
          }
          return { data: [], error: null };
        }
        try {
          const headers = { ...getHeaders() };
          if (_wantReturn) headers["Prefer"] = "return=representation";
          const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${buildQS()}`, {
            method: _method, headers, body: _body,
          });
          const text = await r.text();
          let data = null;
          try { data = text ? JSON.parse(text) : null; } catch { data = null; }
          if (!r.ok) return { data: null, error: data || { message: r.statusText } };
          return { data: Array.isArray(data) ? data : (data ? [data] : []), error: null };
        } catch(e) { return { data: null, error: e }; }
      };

      const builder = {
        // Terminal: run the query
        then: (res, rej) => execute().then(res, rej),

        // READ
        select: (filter = "") => {
          // Only set GET if no write method already set (i.e. not after insert/update)
          if (_method === "GET" || !_method) _method = "GET";
          // If called after insert/update, just ensure return=representation (already set by _wantReturn)
          if (filter) _filters.push(...filter.split("&").filter(Boolean));
          return builder;
        },
        order: (col, opts = {}) => {
          _order = `${col}.${opts.ascending === false ? "desc" : opts.ascending === true ? "asc" : "desc"}`;
          return builder;
        },
        limit: (n) => { _limit = n; return builder; },
        eq: (col, val) => { _filters.push(`${col}=eq.${val}`); return builder; },
        neq: (col, val) => { _filters.push(`${col}=neq.${val}`); return builder; },
        is: (col, val) => { _filters.push(`${col}=is.${val}`); return builder; },
        not: (col, op, val) => { _filters.push(`${col}=not.${op}.${val}`); return builder; },

        // WRITE
        insert: (row) => {
          _method = "POST";
          _body = JSON.stringify(row);
          _wantReturn = true;
          return builder;
        },
        update: (vals) => {
          _method = "PATCH";
          _body = JSON.stringify(vals);
          _wantReturn = true;
          return builder;
        },
        upsert: (rows, opts = {}) => {
          _method = "POST";
          _body = JSON.stringify(rows);
          _wantReturn = true;
          if (opts.onConflict) {
            _filters.push(`on_conflict=${opts.onConflict}`);
          }
          // Supabase upsert uses Prefer header
          return {
            ...builder,
            then: (res, rej) => {
              const h = { ...getHeaders(), "Prefer": `resolution=merge-duplicates,return=representation` };
              if (USE_MOCK) return Promise.resolve({ data: [], error: null }).then(res, rej);
              return fetch(`${SUPABASE_URL}/rest/v1/${table}${buildQS()}`, {
                method: "POST", headers: h, body: _body,
              }).then(async r => {
                const text = await r.text();
                let data = null;
                try { data = text ? JSON.parse(text) : null; } catch {}
                return r.ok ? { data: data || [], error: null } : { data: null, error: data };
              }).then(res, rej);
            }
          };
        },
        delete: () => {
          _method = "DELETE";
          return builder;
        },
      };
      return builder;
    },
  };
  return client;
};

export const sb = makeClient(() => ({
  "apikey": SUPABASE_ANON,
  "Authorization": `Bearer ${SUPABASE_ANON}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
}));

// ─── OFFLINE QUEUE ────────────────────────────────────────────────────────────
const OFFLINE_DB = "oh_offline";
const OFFLINE_STORE = "queue";

export const offlineQ = {
  open: () => new Promise((res, rej) => {
    const req = indexedDB.open(OFFLINE_DB, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(OFFLINE_STORE, { keyPath: "id", autoIncrement: true });
    req.onsuccess = e => res(e.target.result);
    req.onerror = e => rej(e);
  }),
  push: async (record) => {
    try {
      const db = await offlineQ.open();
      const tx = db.transaction(OFFLINE_STORE, "readwrite");
      tx.objectStore(OFFLINE_STORE).add(record);
    } catch(e) { console.warn("IndexedDB push failed:", e); }
  },
  getAll: async () => {
    try {
      const db = await offlineQ.open();
      return new Promise((res) => {
        const tx = db.transaction(OFFLINE_STORE, "readonly");
        const req = tx.objectStore(OFFLINE_STORE).getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      });
    } catch(e) { return []; }
  },
  remove: async (id) => {
    try {
      const db = await offlineQ.open();
      const tx = db.transaction(OFFLINE_STORE, "readwrite");
      tx.objectStore(OFFLINE_STORE).delete(id);
    } catch(e) {}
  },
  flush: async () => {
    if (!navigator.onLine || USE_MOCK) return;
    const items = await offlineQ.getAll();
    for (const item of items) {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${item.table}`, {
          method: "POST",
          headers: sb.headers(),
          body: JSON.stringify(item.payload),
        });
        if (r.ok) await offlineQ.remove(item.id);
      } catch(e) {}
    }
  },
};

// ─── AUDIT LOG HELPER ─────────────────────────────────────────────────────────

export const auth = {
  signUp: async (email, password, meta) => {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, data: meta }),
    });
    return r.json();
  },
  signIn: async (email, password) => {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  },
  signOut: async (token) => {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${token}` },
    });
  },
  getUser: async (token) => {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${token}` },
    });
    return r.json();
  },
};

export const sbAuth = (token) => makeClient(() => ({
  "apikey": SUPABASE_ANON,
  "Authorization": `Bearer ${token || SUPABASE_ANON}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
}));
