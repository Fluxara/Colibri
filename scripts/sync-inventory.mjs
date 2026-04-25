#!/usr/bin/env node
/**
 * Fetches a published Google Sheet as CSV and writes assets/inventory.json.
 * Env: INVENTORY_SHEET_CSV_URL (required for a successful sync).
 *
 * On fetch/parse failure: exits 0 without overwriting inventory.json
 * (keeps last good file for the live site).
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "assets", "inventory.json");

const url = process.env.INVENTORY_SHEET_CSV_URL?.trim();

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || (c === "\r" && text[i + 1] === "\n")) {
      if (c === "\r") i++;
      row.push(field);
      if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      row.push(field);
      if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  row.push(field);
  if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
  return rows;
}

function normHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pickColumns(headers) {
  const n = headers.map(normHeader);
  let cut = -1;
  let quantity = -1;
  let pricePerLb = -1;
  let total = -1;
  const has4Cols = headers.length >= 4;

  function looksLikeTotalHeader(h) {
    // Accept common misspellings users might type in sheets.
    return (
      h === "estimated total" ||
      h === "total" ||
      h.includes("estimated total") ||
      h.includes("total amount") ||
      h.includes("total") ||
      h.includes("toatl") ||
      h.includes("esitmated")
    );
  }

  function looksLikePricePerLbHeader(h) {
    return (
      h === "price/lb" ||
      h === "price per lb" ||
      h === "price per pound" ||
      h === "lb price" ||
      h.includes("price/lb") ||
      ((h.includes("price") || h.includes("cost")) && (h.includes("lb") || h.includes("pound")))
    );
  }

  n.forEach((h, idx) => {
    if (cut < 0 && (h === "cut" || h === "item" || h === "name" || h.includes("cut")))
      cut = idx;
    if (
      quantity < 0 &&
      (h === "quantity" ||
        h === "qty" ||
        h.includes("quantity") ||
        h.includes("lbs") ||
        h.includes("weight") ||
        h.includes("approx"))
    )
      quantity = idx;
    if (pricePerLb < 0 && looksLikePricePerLbHeader(h))
      pricePerLb = idx;
    if (total < 0 && looksLikeTotalHeader(h))
      total = idx;
  });

  // Second pass for legacy sheet headings if no explicit "total" header was found.
  if (total < 0) {
    n.forEach((h, idx) => {
      if (total >= 0) return;
      if (h.includes("amount") || h === "$") total = idx;
    });
  }

  if (cut < 0) cut = 0;
  if (quantity < 0) quantity = 1;
  if (pricePerLb < 0) {
    // For common 4-column layout: cut, quantity, price/lb, total
    if (has4Cols) {
      pricePerLb = 2;
    } else {
      pricePerLb = 2;
    }
  }
  if (total < 0) {
    if (has4Cols) {
      total = 3;
    } else {
      total = pricePerLb === 2 ? 3 : 2;
    }
  }
  return { cut, quantity, pricePerLb, total };
}

function parseMoney(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace(/[$,]/g, "").replace(/^\s*~\s*/, "").trim();
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return s;
  return n;
}

function formatMoney(value) {
  if (typeof value === "string") return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

async function main() {
  if (!url) {
    console.warn(
      "[sync-inventory] INVENTORY_SHEET_CSV_URL is not set. Skipping sync (leaving existing inventory.json unchanged)."
    );
    process.exit(0);
  }

  let csvText;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      console.error(`[sync-inventory] HTTP ${res.status} fetching CSV`);
      process.exit(0);
    }
    csvText = await res.text();
    if (csvText.charCodeAt(0) === 0xfeff) csvText = csvText.slice(1);
  } catch (e) {
    console.error("[sync-inventory] Fetch failed:", e?.message || e);
    process.exit(0);
  }

  let grid;
  try {
    grid = parseCsv(csvText);
  } catch (e) {
    console.error("[sync-inventory] CSV parse failed:", e?.message || e);
    process.exit(0);
  }

  if (!grid.length) {
    console.error("[sync-inventory] No rows in CSV");
    process.exit(0);
  }

  const headerRow = grid[0].map((c) => String(c).trim());
  const { cut, quantity, pricePerLb, total } = pickColumns(headerRow);
  const rows = [];

  for (let r = 1; r < grid.length; r++) {
    const line = grid[r];
    const cutVal = String(line[cut] ?? "").trim();
    if (!cutVal) continue;
    const qtyVal = String(line[quantity] ?? "").trim();
    const pricePerLbRaw = line[pricePerLb];
    const pricePerLbMoney = parseMoney(pricePerLbRaw);
    const totalRaw = line[total];
    const money = parseMoney(totalRaw);
    rows.push({
      cut: cutVal,
      quantity: qtyVal || "—",
      pricePerLb:
        pricePerLbMoney === null
          ? "—"
          : typeof pricePerLbMoney === "number"
            ? formatMoney(pricePerLbMoney)
            : pricePerLbMoney,
      total: money === null ? "—" : typeof money === "number" ? formatMoney(money) : money,
    });
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    source: "google-sheet-csv",
    rows,
  };

  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`[sync-inventory] Wrote ${rows.length} rows to assets/inventory.json`);
}

main();
