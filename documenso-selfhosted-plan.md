# Self-Hosted Documenso — Implementation Plan

**Goal:** Full white-label control over the signing page and certificate PDF — custom GLC logo,
no QR code, no "Powered by Documenso" text, your own domain for signing links.

**Integration point:** Only `DOCUMENSO_API_URL` changes in this app — all client code in
`src/lib/documenso/` is provider-agnostic and requires zero modification.

---

## 1. What You'll Have After This

- Signing emails sent from your domain (e.g. `sign@globallegalcheck.fi`)
- Signing links pointing to `sign.globallegalcheck.fi/sign/...` (not `app.documenso.com`)
- Certificate PDF with GLC logo, no QR code, no Documenso branding
- Full control over signing page colors, fonts, and layout going forward
- No per-document or monthly API fees

---

## 2. Infrastructure Requirements

| Component       | Required by Documenso | Status in GLC          | Action needed            |
|-----------------|----------------------|------------------------|--------------------------|
| PostgreSQL      | ✅ yes               | ✅ running on :5432    | Create a separate DB     |
| File storage    | ✅ yes (local or S3) | ✅ MinIO on :9000      | Create a new bucket      |
| SMTP            | ✅ yes               | ❓ check if configured | Add SMTP provider        |
| Signing cert    | ✅ .p12 file         | ❌ not yet             | Generate once (5 min)    |
| Docker          | for containerised run| likely available       | Install if missing       |
| Domain + SSL    | for production URLs  | ❌ not yet             | Point subdomain + cert   |
| Server / VPS    | to host the container| ❌ not yet             | Any VPS or cloud VM      |

### Recommended hosting topology (production)

```
[GLC App server]          [Documenso server]
 app.yourdomain.fi    →    sign.yourdomain.fi
  - Next.js app             - Documenso (Docker)
  - PostgreSQL (shared)     - uses same Postgres host
  - MinIO                   - uses same MinIO host
```

Documenso can share the same Postgres host — just a separate database.
Documenso can use the same MinIO — just a separate bucket (`documenso`).

---

## 3. Code Changes in Documenso Source

Fork or clone the repo. Make these changes before building the Docker image.

### 3.1 Replace the logo — 1 file, 15 minutes

**File:** `apps/remix/app/components/general/branding-logo.tsx`

Replace the `<svg>` element's path data with your own SVG paths, or swap it for an `<img>` tag:

```tsx
// Option A: inline SVG (recommended — no external request)
export const BrandingLogo = ({ ...props }: LogoProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 XXX YYY" {...props}>
    {/* paste your GLC SVG paths here */}
  </svg>
)

// Option B: image file
export const BrandingLogo = ({ className }: { className?: string }) => (
  <img src="/glc-logo.png" alt="GLC" className={className} />
)
```

Also update the companion icon file if needed:
`apps/remix/app/components/general/branding-logo-icon.tsx`

### 3.2 Remove QR code from certificate PDF — 7 lines, 5 minutes

**File:** `apps/remix/app/routes/_internal+/[__htmltopdf]+/certificate.tsx`

Find and **delete** this block (the QR code div):

```tsx
<div className="flex items-end justify-end gap-x-4">
  <div
    className="flex h-24 w-24 justify-center"
    dangerouslySetInnerHTML={{
      __html: renderSVG(`${NEXT_PUBLIC_WEBAPP_URL()}/share/${document.qrToken}`, {
        ecc: 'Q',
      }),
    }}
  />
</div>
```

The "Powered by Documenso" text and the logo block directly below it can be kept (with your
logo) or also deleted. The outer `{!hidePoweredBy && (...)}` conditional can be removed too
once you own the code — just always render your logo unconditionally.

### 3.3 Optional — update page title, favicon, meta tags

**File:** `apps/remix/app/root.tsx` (or equivalent layout file)

Change `<title>` and `<meta>` tags, swap favicon in `public/`.

---

## 4. Signing Certificate (.p12)

A signing certificate embeds a cryptographic signature into every PDF.
This is a one-time setup step — generate it once, commit the file securely.

```bash
# Step 1: Generate private key
openssl genrsa -out documenso.key 4096

# Step 2: Create self-signed certificate (valid 10 years)
openssl req -new -x509 -key documenso.key -out documenso.crt -days 3650 \
  -subj "/CN=GLC Signing/O=GlobalLegalCheck/C=FI"

# Step 3: Bundle into .p12 with a password
openssl pkcs12 -export \
  -out documenso.p12 \
  -inkey documenso.key \
  -in documenso.crt \
  -passout pass:YOUR_CERT_PASSWORD

# Step 4: Clean up key and cert (only keep .p12)
rm documenso.key documenso.crt
```

Store `documenso.p12` in a secure location (not committed to git).
The password goes into the env var `NEXT_PRIVATE_SIGNING_PASSPHRASE`.

---

## 5. Docker Compose Setup

Create a `docker-compose.documenso.yml` alongside your existing infrastructure
(or add services to an existing compose file):

```yaml
version: '3.9'

services:
  documenso:
    image: documenso-glc:latest   # built from your fork (see section 6)
    restart: unless-stopped
    ports:
      - '3001:3000'               # expose on port 3001 locally; nginx proxies to sign.yourdomain.fi
    volumes:
      - ./certs/documenso.p12:/app/cert.p12:ro
    environment:
      # ── App ────────────────────────────────────────────────────
      NEXT_PUBLIC_WEBAPP_URL: https://sign.yourdomain.fi

      # ── Database ───────────────────────────────────────────────
      # Use the same Postgres host, but a separate database
      NEXT_PRIVATE_DATABASE_URL: postgresql://documenso_user:PASSWORD@host.docker.internal:5432/documenso
      NEXT_PRIVATE_DIRECT_DATABASE_URL: postgresql://documenso_user:PASSWORD@host.docker.internal:5432/documenso

      # ── Auth & Encryption ──────────────────────────────────────
      NEXTAUTH_SECRET: <generate: openssl rand -base64 32>
      NEXT_PRIVATE_ENCRYPTION_KEY: <generate: 32+ char random string>
      NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY: <generate: 32+ char random string>

      # ── Signing Certificate ────────────────────────────────────
      NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH: /app/cert.p12
      NEXT_PRIVATE_SIGNING_PASSPHRASE: YOUR_CERT_PASSWORD

      # ── Email / SMTP ───────────────────────────────────────────
      NEXT_PRIVATE_SMTP_TRANSPORT: smtp-auth
      NEXT_PRIVATE_SMTP_HOST: smtp.yourmailprovider.com
      NEXT_PRIVATE_SMTP_PORT: 587
      NEXT_PRIVATE_SMTP_USERNAME: sign@yourdomain.fi
      NEXT_PRIVATE_SMTP_PASSWORD: YOUR_SMTP_PASSWORD
      NEXT_PRIVATE_SMTP_FROM_ADDRESS: sign@yourdomain.fi
      NEXT_PRIVATE_SMTP_FROM_NAME: GLC Signatures

      # ── Storage (MinIO) ────────────────────────────────────────
      NEXT_PRIVATE_UPLOAD_TRANSPORT: s3
      NEXT_PRIVATE_UPLOAD_BUCKET: documenso
      NEXT_PRIVATE_UPLOAD_ENDPOINT: http://host.docker.internal:9000
      NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID: YOUR_MINIO_ACCESS_KEY
      NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY: YOUR_MINIO_SECRET_KEY
      NEXT_PRIVATE_UPLOAD_REGION: us-east-1   # MinIO ignores this but it's required
      NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE: 'true'  # required for MinIO
```

**Create the Postgres database and user:**
```sql
CREATE DATABASE documenso;
CREATE USER documenso_user WITH ENCRYPTED PASSWORD 'PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE documenso TO documenso_user;
```

**Create the MinIO bucket:**
```bash
mc alias set local http://localhost:9000 MINIO_ACCESS_KEY MINIO_SECRET_KEY
mc mb local/documenso
```

---

## 6. Building the Custom Docker Image

Build from your fork after making the code changes in section 3.

```bash
# Clone Documenso
git clone https://github.com/documenso/documenso documenso-glc
cd documenso-glc

# ── Make code changes ────────────────────────────────────────
# 1. Edit apps/remix/app/components/general/branding-logo.tsx  (your logo)
# 2. Edit apps/remix/app/routes/_internal+/[__htmltopdf]+/certificate.tsx (remove QR code)
# 3. Optional: swap favicon, update page title

# ── Build Docker image ───────────────────────────────────────
docker build -f docker/Dockerfile -t documenso-glc:latest .

# Push to your container registry (if deploying to a remote server)
docker tag documenso-glc:latest registry.yourdomain.fi/documenso-glc:latest
docker push registry.yourdomain.fi/documenso-glc:latest
```

Alternatively if you don't want to maintain a fork, you can:
1. Build the image locally
2. Export it: `docker save documenso-glc:latest | gzip > documenso-glc.tar.gz`
3. Transfer and load on your server: `docker load < documenso-glc.tar.gz`

---

## 7. Domain & SSL (nginx reverse proxy)

Point a subdomain `sign.yourdomain.fi` to your server IP.
Use Certbot (Let's Encrypt) for the SSL certificate.

```nginx
# /etc/nginx/sites-available/documenso
server {
    listen 443 ssl;
    server_name sign.yourdomain.fi;

    ssl_certificate     /etc/letsencrypt/live/sign.yourdomain.fi/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sign.yourdomain.fi/privkey.pem;

    location / {
        proxy_pass         http://localhost:3001;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Get SSL certificate
certbot --nginx -d sign.yourdomain.fi
```

---

## 8. Integration Change in This App

After Documenso is running, this is the **only change needed** in the GLC codebase:

**`.env.local` (and production env):**
```diff
- DOCUMENSO_API_URL=https://app.documenso.com
+ DOCUMENSO_API_URL=https://sign.yourdomain.fi
```

The API key changes too — create a new API key in your self-hosted instance's admin UI,
then update `DOCUMENSO_API_KEY`.

All client code in `src/lib/documenso/` is unchanged — the API contract is identical.

---

## 9. First-Run Checklist

After starting the container for the first time:

- [ ] Visit `https://sign.yourdomain.fi` → create admin account
- [ ] Go to Settings → Team → upload GLC logo (backup branding for the UI, separate from cert PDF)
- [ ] Go to Settings → API → create a new API key → copy to `DOCUMENSO_API_KEY`
- [ ] Go to Settings → Email → verify SMTP is working (send a test email)
- [ ] Test: send a signature request from GLC → verify signing email arrives
- [ ] Test: sign the document → verify certificate PDF has GLC logo and no QR code
- [ ] Test: verify signed PDF downloads correctly into MinIO
- [ ] Confirm `providerDocumentId` (envelope ID) still populates in DB correctly

---

## 10. Maintenance Considerations

**Keeping up with Documenso updates:**
Since you fork and patch the source, upstream updates require a manual rebase/merge.
The two changes are minimal (logo SVG swap, 7-line delete), so merging is low friction.

Alternatively: maintain a small git patch file:
```bash
git diff HEAD > glc-branding.patch
# Apply to a fresh clone later:
git apply glc-branding.patch
```

**Certificate renewal:**
The self-signed cert is valid for 10 years — no renewal needed.
If you ever use a CA-issued cert, set a calendar reminder before expiry.

**Backups:**
- Postgres `documenso` database (add to your existing backup routine)
- MinIO `documenso` bucket (add to existing MinIO backup)
- The `.p12` certificate file (store a copy somewhere safe)

---

## 11. Summary of Effort

| Task                              | Estimated time  |
|-----------------------------------|-----------------|
| Clone Documenso, make code changes| 30 min          |
| Generate signing certificate      | 5 min           |
| Set up Postgres DB + MinIO bucket | 15 min          |
| Write docker-compose + env vars   | 30 min          |
| Build Docker image                | 15–30 min       |
| Domain DNS + nginx + SSL          | 30–60 min       |
| First-run setup + testing         | 30 min          |
| Update DOCUMENSO_API_URL in app   | 2 min           |
| **Total**                         | **~3–4 hours**  |

---

## 12. Complete Step-by-Step Execution Guide

End-to-end walkthrough in exact order. Run all commands on the **server** unless noted as **[local]**.

---

### Prerequisites

Before starting, confirm you have:
- A Linux server (VPS or cloud VM) with Docker + Docker Compose installed
- A domain with DNS access (to point a subdomain to the server)
- An SMTP provider account (Resend, Postmark, Mailgun, SendGrid, or any SMTP relay)
- PostgreSQL running and accessible (shared with the GLC app is fine)
- MinIO running and accessible

---

### Step 1 — Clone Documenso and apply branding [local]

```bash
git clone https://github.com/documenso/documenso documenso-glc
cd documenso-glc
```

**1a. Replace the logo** — edit `apps/remix/app/components/general/branding-logo.tsx`:

```tsx
// Replace the existing <svg> export with your own logo
export const BrandingLogo = ({ className }: { className?: string }) => (
  <img src="/glc-logo.png" alt="GLC" className={className} />
)
```

Copy your `glc-logo.png` into `apps/remix/public/`.

Also update the icon file `apps/remix/app/components/general/branding-logo-icon.tsx` if needed.

**1b. Remove QR code from certificate PDF** — edit
`apps/remix/app/routes/_internal+/[__htmltopdf]+/certificate.tsx`:

Delete this block:
```tsx
<div className="flex items-end justify-end gap-x-4">
  <div
    className="flex h-24 w-24 justify-center"
    dangerouslySetInnerHTML={{
      __html: renderSVG(`${NEXT_PUBLIC_WEBAPP_URL()}/share/${document.qrToken}`, {
        ecc: 'Q',
      }),
    }}
  />
</div>
```

**1c. (Optional) Update page title and favicon** — edit `apps/remix/app/root.tsx`,
swap `public/favicon.ico`.

---

### Step 2 — Generate the signing certificate [local or server]

```bash
# Generate private key
openssl genrsa -out documenso.key 4096

# Self-signed certificate valid 10 years
openssl req -new -x509 -key documenso.key -out documenso.crt -days 3650 \
  -subj "/CN=GLC Signing/O=GlobalLegalCheck/C=FI"

# Bundle into .p12
openssl pkcs12 -export \
  -out documenso.p12 \
  -inkey documenso.key \
  -in documenso.crt \
  -passout pass:YOUR_CERT_PASSWORD

# Remove raw key and cert — only .p12 is needed
rm documenso.key documenso.crt
```

Store `documenso.p12` securely. Copy it to the server:

```bash
scp documenso.p12 user@your-server:/opt/documenso/certs/documenso.p12
```

---

### Step 3 — Create the PostgreSQL database [server]

Connect to Postgres and run:

```sql
CREATE DATABASE documenso;
CREATE USER documenso_user WITH ENCRYPTED PASSWORD 'YOUR_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE documenso TO documenso_user;
-- Required for Prisma migrations on Postgres 15+
ALTER DATABASE documenso OWNER TO documenso_user;
```

Test the connection string:
```bash
psql "postgresql://documenso_user:YOUR_DB_PASSWORD@localhost:5432/documenso" -c "\l"
```

---

### Step 4 — Create the MinIO bucket [server]

```bash
# Set mc alias (if not already set)
mc alias set local http://localhost:9000 MINIO_ACCESS_KEY MINIO_SECRET_KEY

# Create bucket
mc mb local/documenso

# Verify
mc ls local
```

---

### Step 5 — Generate secrets [server]

```bash
# Run three times — one for each secret
openssl rand -hex 32   # → NEXTAUTH_SECRET
openssl rand -hex 32   # → NEXT_PRIVATE_ENCRYPTION_KEY
openssl rand -hex 32   # → NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY
```

Save all three values — you'll need them in Step 6.

---

### Step 6 — Build the custom Docker image [local]

From inside the cloned `documenso-glc` directory:

```bash
docker build -f docker/Dockerfile -t documenso-glc:latest .
```

This takes 15–30 min on first build (installs all dependencies and compiles Next.js).

Transfer to server if building locally:
```bash
docker save documenso-glc:latest | gzip > documenso-glc.tar.gz
scp documenso-glc.tar.gz user@your-server:/opt/documenso/
# On server:
docker load < /opt/documenso/documenso-glc.tar.gz
```

---

### Step 7 — Create and start the Docker Compose service [server]

Create `/opt/documenso/docker-compose.yml`:

```yaml
version: '3.9'

services:
  documenso:
    image: documenso-glc:latest
    restart: unless-stopped
    ports:
      - '3001:3000'
    volumes:
      - /opt/documenso/certs/documenso.p12:/opt/documenso/cert.p12:ro
    environment:
      NEXT_PUBLIC_WEBAPP_URL: https://sign.yourdomain.fi

      NEXT_PRIVATE_DATABASE_URL: postgresql://documenso_user:YOUR_DB_PASSWORD@host.docker.internal:5432/documenso
      NEXT_PRIVATE_DIRECT_DATABASE_URL: postgresql://documenso_user:YOUR_DB_PASSWORD@host.docker.internal:5432/documenso

      NEXTAUTH_SECRET: YOUR_NEXTAUTH_SECRET
      NEXT_PRIVATE_ENCRYPTION_KEY: YOUR_ENCRYPTION_KEY
      NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY: YOUR_ENCRYPTION_SECONDARY_KEY

      NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH: /opt/documenso/cert.p12
      NEXT_PRIVATE_SIGNING_PASSPHRASE: YOUR_CERT_PASSWORD

      NEXT_PRIVATE_SMTP_TRANSPORT: smtp-auth
      NEXT_PRIVATE_SMTP_HOST: smtp.yourmailprovider.com
      NEXT_PRIVATE_SMTP_PORT: 587
      NEXT_PRIVATE_SMTP_USERNAME: sign@yourdomain.fi
      NEXT_PRIVATE_SMTP_PASSWORD: YOUR_SMTP_PASSWORD
      NEXT_PRIVATE_SMTP_FROM_ADDRESS: sign@yourdomain.fi
      NEXT_PRIVATE_SMTP_FROM_NAME: GLC Signatures

      NEXT_PRIVATE_UPLOAD_TRANSPORT: s3
      NEXT_PRIVATE_UPLOAD_BUCKET: documenso
      NEXT_PRIVATE_UPLOAD_ENDPOINT: http://host.docker.internal:9000
      NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID: YOUR_MINIO_ACCESS_KEY
      NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY: YOUR_MINIO_SECRET_KEY
      NEXT_PRIVATE_UPLOAD_REGION: us-east-1
      NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE: 'true'
```

Start the container:
```bash
docker compose -f /opt/documenso/docker-compose.yml up -d

# Watch startup logs (DB migration runs automatically on first boot)
docker compose -f /opt/documenso/docker-compose.yml logs -f
```

Wait for the line:
```
✓ Ready on http://localhost:3000
```

---

### Step 8 — Point DNS and configure nginx [server]

**DNS:** Add an `A` record for `sign.yourdomain.fi` → your server's public IP.
Wait for propagation (check with `dig sign.yourdomain.fi`).

**nginx config** — create `/etc/nginx/sites-available/documenso`:

```nginx
server {
    listen 80;
    server_name sign.yourdomain.fi;
    # Certbot will upgrade this to 443 automatically in Step 9
}
```

Enable and reload:
```bash
ln -s /etc/nginx/sites-available/documenso /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

### Step 9 — Get SSL certificate [server]

```bash
certbot --nginx -d sign.yourdomain.fi
```

Certbot rewrites the nginx config to 443 with Let's Encrypt certs automatically.
Add the proxy block after certbot runs — edit `/etc/nginx/sites-available/documenso`
and insert inside the `server { listen 443 ... }` block:

```nginx
location / {
    proxy_pass         http://localhost:3001;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}
```

```bash
nginx -t && systemctl reload nginx
```

Verify: open `https://sign.yourdomain.fi` in a browser — you should see the Documenso login page with your GLC logo.

---

### Step 10 — First-run admin setup [browser]

1. Go to `https://sign.yourdomain.fi` → click **Create account** → register your admin email
2. **Settings → Team** → upload GLC logo (for the in-app UI; separate from cert PDF branding)
3. **Settings → API** → click **Create API key** → name it `glc-app` → copy the key immediately
4. **Settings → Email** → send a test email → confirm it arrives from `sign@yourdomain.fi`

---

### Step 11 — Update GLC app environment [local]

In `.env.local` (and your production environment):

```diff
- DOCUMENSO_API_URL=https://app.documenso.com
+ DOCUMENSO_API_URL=https://sign.yourdomain.fi

- DOCUMENSO_API_KEY=api_old_cloud_key
+ DOCUMENSO_API_KEY=api_key_from_step_10
```

No code changes required — `src/lib/documenso/` is provider-agnostic.

---

### Step 12 — End-to-end test

Run through the full flow once before going to production:

```
1. In GLC app: open New Signature Request modal
2. Upload a test PDF, add your own email as recipient, click Send
3. Check DB: signature_request row has providerDocumentId populated
4. Check inbox: signing email arrives from sign@yourdomain.fi
5. Click link: lands on sign.yourdomain.fi with GLC logo, no QR/Documenso branding
6. Sign the document
7. In GLC app: click Refresh List — status changes to completed
8. Download the signed PDF: verify GLC logo on certificate, no QR code
9. Check MinIO bucket: signed PDF stored in documenso bucket
```

All 9 points passing = production-ready.

---

---

## White-Label Change Map

Every file that was modified for GLC branding, what it does, and how to change it again.

---

### 1. Brand colours

**`packages/ui/styles/theme.css`**

Controls every colour in the UI (buttons, rings, focus states). Tailwind requires HSL channel format — not hex.

```css
/* Find these two variables and update both :root and .dark blocks */
--primary: 212 100% 49%;          /* GLC blue #007CFA */
--primary-foreground: 0 0% 100%;  /* white text on blue */
--ring: 212 100% 49%;             /* focus ring colour */
```

To change the brand colour: convert your hex to HSL channels (e.g. `#007CFA` → `212 100% 49%`) and replace all three values.

---

### 2. Signature field border colour

**`packages/ui/lib/recipient-colors.ts`**

The `green` entry is the default colour for the first recipient's signature fields on the signing canvas.

```ts
green: {
  baseRing: 'rgba(0, 124, 250, 1)',       // solid border
  baseRingHover: 'rgba(0, 124, 250, 0.3)', // hover fill
  baseTextHover: 'rgba(0, 124, 250, 1)',
  fieldButton: 'hover:border-recipient-blue hover:bg-recipient-blue/30',
  fieldItemInitials: 'group-hover/field-item:bg-recipient-blue',
  // comboxBoxTrigger and comboxBoxItem use recipient-blue too
},
```

Replace `rgba(0, 124, 250, ...)` with your colour. The Tailwind class `recipient-blue` is defined in `packages/tailwind-config/index.cjs` — update it there if you change the colour.

---

### 3. Main app logo (navbar + profile page)

**`apps/remix/app/components/general/branding-logo.tsx`**
**`apps/remix/app/components/general/branding-logo-icon.tsx`**

`BrandingLogo` is the full-size logo shown in the top navbar.
`BrandingLogoIcon` is the compact square icon used in mobile nav and profile pages.

Both components currently point to static files:

```tsx
// branding-logo.tsx
export const BrandingLogo = ({ className, ...props }) => (
  <img src="/glc-logo.png" alt="Global Legal Check" className={className} />
);

// branding-logo-icon.tsx
export const BrandingLogoIcon = ({ className, ...props }) => (
  <img src="/glc-logo-icon.svg" alt="GLC" className={className} />
);
```

Place your logo files at:
- `apps/remix/public/glc-logo.png` — full horizontal logo
- `apps/remix/public/glc-logo-icon.svg` — square icon
- `apps/remix/public/glc-logo.svg` — icon used in PDF header/footer and email

Logo height in the header is set in:
- **`apps/remix/app/components/general/app-header.tsx`** — `className="h-12 w-auto"` on the `<BrandingLogo>` element (line ~66)

---

### 4. Cancel button style on signing dialog

**`apps/remix/app/components/general/document-signing/document-signing-complete-dialog.tsx`**

The "Are you sure?" confirmation dialog has a Cancel button. Changed from `secondary` to `outline` to match GLC design.

```tsx
// Line ~370
<Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
  Cancel
</Button>
```

---

### 5. Certificate PDF — Konva canvas renderer

**`packages/lib/server-only/pdf/render-certificate.ts`**

This is the actual PDF certificate generator (not the HTML route). It uses Konva + Skia canvas to draw everything programmatically.

Changes made:
- Signature field border colour changed from Documenso green to GLC blue:
  ```ts
  // Search for rgba(122, 196, 85 — replace with GLC blue
  rgba(0, 124, 250, 0.6)  // border
  rgba(0, 124, 250, 0.1)  // fill
  ```
- Removed QR code rendering and Documenso logo from `renderBranding()`
- Replaced with plain text: `"Signing certificate provided by: Global Legal Check"`

To change the certificate footer text, find `renderBranding` (~line 560) and edit the `text:` string.

---

### 6. Certificate page — HTML route

**`apps/remix/app/routes/_internal+/[__htmltopdf]+/certificate.tsx`**

The HTML version of the certificate (rendered by `htmltopdf` for print). Updated with GLC styling:
- Dark navy heading with blue accent bar
- Blue table headers
- Blue signature glow
- Footer text: "Signing certificate provided by: Global Legal Check"
- Removed QR code block

To update the footer text, search for `Signing certificate provided by` in this file (~line 385).

---

### 7. Signed document header & footer (PDF stamp)

**`packages/lib/server-only/pdf/add-signed-header-footer.ts`** *(new file)*

Stamps a GLC-branded header and footer onto every original page of a sealed document.

**Header** (top of each page):
- Left: GLC icon + "GlobalLegalCheck — `<document title>`"
- Right: "Electronically signed | Sig ID: `<id>`"
- Bottom edge: thin blue border line

**Footer** (bottom of each page):
- Top edge: thin blue border line
- Left: GLC icon + "Doc ID: `<id>`"
- Center: "This document is legally signed"
- Right: "Signed: `<timestamp>` | Page X of N"

Key constants at the top of the file:
```ts
const HEADER_HEIGHT = 22;    // pts — increase if text is clipped
const FOOTER_HEIGHT = 20;    // pts
const LOGO_HEIGHT = 12;      // pts — icon height
const FONT_SIZE = 7;         // pts
const PADDING = 8;           // pts from page edges
const BORDER_THICKNESS = 0.75;
```

The logo is loaded from `apps/remix/public/glc-logo.svg`.
The font is loaded from `apps/remix/public/fonts/noto-sans.ttf`.

This function is called from **`packages/lib/jobs/definitions/internal/seal-document.handler.ts`** inside `decorateAndSignPdf()`, after all signature fields are inserted and before the final flatten.

---

### 8. Email templates — logo

All email templates are in **`packages/email/templates/`** (23 files).

Every template now renders the GLC icon directly — no branding DB override:
```tsx
<Img
  src={getAssetUrl('/static/glc-logo.svg')}
  alt="GlobalLegalCheck"
  height={48}
  width={53}
  className="mb-4"
/>
```

The icon file is at **`apps/remix/public/static/glc-logo.svg`**.

To update the icon: replace that SVG file. To change the display size: update `height` and `width` (keep the 216:195 aspect ratio → `width = height * 216 / 195`).

Email footer text ("© GlobalLegalCheck. All rights reserved.") is in:
**`packages/email/template-components/template-footer.tsx`**

---

### 9. Static assets reference table

| File | Used in | Notes |
|------|---------|-------|
| `apps/remix/public/glc-logo.svg` | PDF header/footer stamp | 216×195 viewBox |
| `apps/remix/public/glc-logo.png` | App navbar (`BrandingLogo`) | Full horizontal logo |
| `apps/remix/public/glc-logo-icon.svg` | Mobile nav, profile page | Square icon |
| `apps/remix/public/static/glc-logo.svg` | All email templates | Copy of main SVG |
| `apps/remix/public/static/logo.png` | Fallback (legacy) | Can be replaced with GLC PNG |
| `apps/remix/public/favicon.ico` | Browser tab | Replace with GLC icon |
| `apps/remix/public/site.webmanifest` | PWA name | Update `"name"` and `"short_name"` |
