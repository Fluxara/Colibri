# Colibri Land & Cattle (GitHub Pages)

Static site: `index.html`, `gallery.html`, `styles.css`, and `assets/`.

## Run API routes locally (optional)

The `api/` folder includes serverless handlers (for example `GET /api/availability`). To run them with the static site:

```bash
npm install
npm run dev
```

This uses `vercel dev` to serve the static site and API routes together.

## Automated inventory (Google Sheet)

Inventory on the home page is loaded from [`assets/inventory.json`](assets/inventory.json). To update it **without** editing the repo every day:

1. Create a Google Sheet with columns described in [`docs/INVENTORY_SHEET.md`](docs/INVENTORY_SHEET.md).
2. Add the repository secret **`INVENTORY_SHEET_CSV_URL`** with your sheet’s CSV export URL (see doc).
3. GitHub Actions runs [**Sync inventory from Google Sheet**](.github/workflows/inventory-sync.yml) on a **daily** schedule and can be run **manually** anytime (**Actions** → workflow → **Run workflow**).

After each successful sync, the workflow commits an updated `assets/inventory.json` to the default branch; GitHub Pages will pick it up on the next deploy.

If your default branch is **protected** and bots cannot push, either allow GitHub Actions to push to that branch or run the workflow from a non-protected branch and merge via PR (adjust the workflow to open a PR instead of `git push`).

### Local sync (optional)

```bash
export INVENTORY_SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/YOUR_ID/export?format=csv&gid=YOUR_GID"
npm run sync-inventory
git add assets/inventory.json && git commit -m "chore: sync inventory" && git push
```

If `INVENTORY_SHEET_CSV_URL` is unset, the sync script does nothing and leaves the existing JSON unchanged.
