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
5. In the production environment variables, set both required secrets:
   - `ADMIN_PASSCODE`: the passcode for the site's admin area.
   - `SESSION_SECRET`: a unique random secret of at least 32 bytes used to
     sign session cookies.
   - Set `COOKIE_SECURE=true` as well when running behind a production HTTPS
     proxy outside Deno Deploy. Deno Deploy enables the `Secure` cookie flag
     automatically.
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
3. Admin login succeeds using `ADMIN_PASSCODE` and persists after reload.
4. Approving a pending member removes it from the moderation list and exposes it
   in the members view.
5. The approved member can log in, reserve and cancel their own place, submit a
   PR and submit a WOD score; logout returns those actions to the login prompt.

## Local validation

Install Deno 2 and run:

```powershell
deno task build
```

On a Windows network that intercepts TLS with a trusted corporate certificate,
Deno can use the Windows certificate store for the command only:

```powershell
$env:DENO_TLS_CA_STORE = "system"
deno task build
```

References: <https://docs.deno.com/deploy/migration_guide/> and
<https://docs.deno.com/deploy/getting_started/>.
