# Deploying to Deno Deploy

This project uses the current Deno Deploy platform at
<https://console.deno.com>. Deploy Classic, `deployctl`, and the legacy
`DENO_DEPLOY_TOKEN` GitHub secret are not used.

## One-time app setup

1. Sign in to <https://console.deno.com> and create a Deno Deploy organization.
2. Create a new app and link
   `Danielcampanaizquierdo/Deloitte-Crossfit-Hyrox-Club` through the Deno Deploy
   GitHub integration.
3. Use the Fresh framework preset detected by Deno Deploy. If the dashboard asks
   for these values, use `deno task build` as the build command and `main.ts` as
   the entrypoint.
4. Provision a Deno KV database in the Deno Deploy console and assign it to this
   app. The app connects to its assigned KV database automatically at runtime
   (`Deno.openKv()`), with no connection string or token in the code.
5. In the production environment variables, set the required secrets:
   - `INITIAL_ADMIN_EMAIL`: email for the first individual administrator.
   - `INITIAL_ADMIN_NAME`: display name for that administrator.
   - `INITIAL_ADMIN_PASSWORD`: a strong initial password (minimum 8 characters).
     It is hashed with PBKDF2 before being stored; bootstrap is idempotent,
     never overwrites the account after creation and never creates a second
     superadmin if these variables are later changed.
   - `SESSION_SECRET`: a unique random secret of at least 32 bytes used to sign
     session cookies.
   - `APP_ORIGIN`: optional canonical origin (for example
     `https://club.example`) used by mutation Origin checks. It is recommended
     behind a proxy whose internal request URL differs from the public URL.
   - Set `COOKIE_SECURE=true` as well when running behind a production HTTPS
     proxy outside Deno Deploy. Deno Deploy enables the `Secure` cookie flag
     automatically.
   - Leave `TRUST_PROXY_HEADER` unset unless a trusted edge proxy overwrites the
     selected client-IP header. Supported values are `cf-connecting-ip`,
     `x-real-ip` and `x-forwarded-for`; enabling one for a proxy that merely
     forwards user input would weaken login/register rate limits.
6. Deploy the default branch (`main`) and wait for the build and warm-up stages
   to finish in the Deno Deploy dashboard.

Deno Deploy builds and deploys linked GitHub commits itself. The repository
workflow in `.github/workflows/ci.yml` is intentionally limited to independent
build verification.

## Verification

After the first deployment, open the production URL shown in Deno Deploy and
verify that:

1. The home page loads.
2. A member registration can be submitted.
3. Admin login succeeds using `INITIAL_ADMIN_EMAIL` and
   `INITIAL_ADMIN_PASSWORD`, and persists after reload.
4. Approving a pending member removes it from the moderation list and exposes it
   in the members view.
5. The approved member can log in, reserve and cancel their own place, submit a
   PR and submit a WOD score; logout revokes that cookie server-side and returns
   those actions to the login prompt.
6. Changing a member password revokes all of that member's previous sessions.

## Local validation

Install Deno 2 and run:

```powershell
$env:INITIAL_ADMIN_EMAIL = "admin@example.com"
$env:INITIAL_ADMIN_NAME = "Club Admin"
$env:INITIAL_ADMIN_PASSWORD = "replace-with-a-strong-password"
$env:SESSION_SECRET = "replace-with-at-least-32-random-characters"
deno task build
deno test -A
```

On a Windows network that intercepts TLS with a trusted corporate certificate,
Deno can use the Windows certificate store for the command only:

```powershell
$env:DENO_TLS_CA_STORE = "system"
deno task build
```

References: <https://docs.deno.com/deploy/migration_guide/> and
<https://docs.deno.com/deploy/getting_started/>.
