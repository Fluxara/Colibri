# Inventory Google Sheet

The site loads inventory from [`assets/inventory.json`](../assets/inventory.json). A GitHub Action (or you, locally) can refresh that file from a **published CSV** export of your Google Sheet.

## Column schema

Use **row 1** as headers. Each data row is one inventory line.

| Column purpose | Accepted header names (case-insensitive) |
|----------------|------------------------------------------|
| Cut / item name | `cut`, `item`, `name`, or any header containing `cut` |
| Approx. quantity | `quantity`, `qty`, `lbs`, `weight`, `approx`, or any header containing `quantity` or `lbs` |
| Price per lb | `price/lb`, `price per lb`, `price per pound`, `lb price`, or any header containing both `price` and `lb`/`pound` |
| Estimated total | `total`, `price`, `amount`, or any header containing `total` or `$` |

Example:

| cut | quantity | price/lb | total |
|-----|----------|----------|-------|
| Filet Mignon | 3.66 lbs | 32.00 | 117.12 |
| Flat Iron | 1.46 lbs | 22.75 | 33.21 |

- **Quantity** is stored as plain text (e.g. `7.00 lbs (2 roasts)`, `6 bones`, `Two 5 lb bags`).
- **Price per lb** can be a number (`32`) or text (`$32.00`); numbers are formatted as currency on the site.
- **Total** can be a number (`117.12`) or text (`$117.12`); numbers are formatted as currency on the site.

Empty rows are skipped. Rows with no `cut` are skipped.

## Publishing the sheet as CSV

1. Create a Google Sheet with the headers above (any tab name is fine).
2. **Share** the sheet so “Anyone with the link” can **View** (required for the export URL to work without OAuth).
3. Copy the sheet ID from the URL:  
   `https://docs.google.com/spreadsheets/d/`**`SHEET_ID`**`/edit`
4. Find the **gid** of the tab you want (in the URL: `...#gid=123456789`).
5. Your CSV URL is:

   `https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=GID`

6. In GitHub: **Settings → Secrets and variables → Actions** → add repository secret:

   - Name: `INVENTORY_SHEET_CSV_URL`  
   - Value: the full URL from step 5.

## Local sync (optional)

```bash
export INVENTORY_SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=..."
npm run sync-inventory
```

Writes `assets/inventory.json`. Commit when you are happy with the result.
