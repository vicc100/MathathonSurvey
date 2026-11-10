// Fill these in from Supabase → Project Settings → API (or "API Keys").
// The anon / publishable key is safe to expose in the browser: row-level
// security (see supabase/schema.sql) only lets visitors INSERT responses,
// never read them.
window.MATHATHON_CONFIG = {
  SUPABASE_URL: "",       // e.g. "https://abcdefghijkl.supabase.co"
  SUPABASE_ANON_KEY: "",  // the anon / publishable key
  TABLE: "responses",
};
