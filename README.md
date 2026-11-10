# Caltech Mathathon Survey

A static site (plain HTML/CSS/JS, no build step) with three surveys that save to Supabase.

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The site |
| `surveys.js` | All questions. Edit here to add, remove or reword questions |
| `config.js` | Your Supabase URL + public key |
| `supabase/schema.sql` | Database table, security rules, export views |

## 1. Set up Supabase (free tier, unlimited responses in practice)

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, click **Run**.
3. Open **Project Settings → API Keys** and copy the **Project URL** and the
   **anon / publishable** key (never the `service_role` / secret key).
4. Paste both into `config.js`.

The public key can only *insert* rows; nobody can read responses from the website.

## 2. Deploy to Vercel

**Option A: CLI** (needs Node.js from https://nodejs.org)

```bash
npx vercel deploy --prod
```

**Option B: GitHub**: push this folder to a GitHub repo, then at https://vercel.com/new
import the repo. Framework preset: **Other**. No build command. Deploy.

## 3. Read the results

Supabase → **Table Editor**:
- `responses`: every submission (answers stored as JSON)
- `demographics_flat`, `future_of_ai_flat`, `education_flat`: one column per question;
  use **Export → CSV** to analyse in Sheets/Excel/Python.

`respondent_id` is an anonymous random ID stored in the browser, so you can link one
person's three surveys together without collecting names or emails.

## Local preview

```bash
python3 -m http.server 5173
```

Without Supabase keys, the site runs in **preview mode** and stores responses only in that browser.
