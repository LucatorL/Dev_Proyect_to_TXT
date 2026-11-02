# Deploy from GitHub to your own Cloudflare account

The main app can run on Cloudflare Workers with static assets and D1. This deployment uses the code in this repository and your own Cloudflare database; it does not depend on the ChatGPT preview host.

## Connect the repository

1. In Cloudflare, open **Workers & Pages → Create application → Connect GitHub**.
2. Select **LucatorL/Dev_Proyect_to_TXT**.
3. Use these settings:

| Setting | Value |
| --- | --- |
| Project name | `dev-proyect-to-txt` |
| Production branch | `main` |
| Root directory | Repository root; leave the default |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npm run deploy:cloudflare` |
| Enable Preview builds | Off for the initial setup |
| Protect with Cloudflare Access | Off for a public app |

Node.js 22 is selected by `.node-version`. Wrangler is pinned in `package-lock.json`.

The first deploy provisions a D1 database through the `DB` binding in `wrangler.jsonc`. The deployment script then applies the SQL migrations. On this first deployment the leaderboard API is ready once the migration step finishes; wait for the entire build to succeed before sharing the URL.

Later pushes to `main` trigger a new production build. The existing database is reused, and D1 records which migrations have already run so they are not repeated. Keep the Worker name and database binding stable. Do not delete the D1 database when updating the app. The SQL reset in the historical migration `0001_reset_leaderboard.sql` runs once on a fresh database, while it is still empty.

This creates a separate database from any previous host. Existing scores would need an explicit data migration if they need to be retained. Browser history and preferences also belong to each web origin and do not automatically transfer to the new address.

## Add the domain

After the build succeeds, open the Worker's **Settings → Domains & Routes → Add → Custom Domain** and enter `unificador.lucassanchez.net`. The domain must be in your Cloudflare account. Cloudflare configures the DNS and HTTPS for that Worker.

Configure the custom domain in the dashboard. Leave it out of the repository so contributors can deploy their own copies without taking over this hostname. Remove any conflicting DNS record for this exact subdomain before adding it. Keep unrelated DNS records as they are.

## Local checks

```bash
npm ci
npm run build:cloudflare
npx wrangler deploy --dry-run
npx wrangler d1 migrations apply DB --local
npx wrangler dev
```

The `--local` database is separate from production. It can be used to test profile creation, unification counts and repeated-event deduplication without changing the public ranking.

`npm run build` still creates the original bundled Worker in `dist/server/index.js`. The direct Cloudflare deployment uses `worker/index.js` and serves the `out/` assets separately.
