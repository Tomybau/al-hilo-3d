/**
 * Script de importación: juguetes, filamentos y ventas desde CSVs.
 * Uso: npx tsx prisma/import-data.ts
 */
import { PrismaClient, FilamentType } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

function parseARS(raw: string): number {
  if (!raw) return 0;
  // "$7.000,00" → 7000
  const clean = raw.replace(/[$\s"]/g, "").replace(/\./g, "").replace(",", ".");
  return Number(clean) || 0;
}

function parseNum(raw: string): number {
  if (!raw) return 0;
  return Number(raw.replace(",", ".")) || 0;
}

/** RFC-4180 CSV row parser (handles quoted fields with commas) */
function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// ─── Juguetes ───────────────────────────────────────────────────────────────

function loadJuguetes(): Array<{
  name: string;
  price: number;
  minutes: number | null;
  grams: number | null;
}> {
  const raw = fs.readFileSync(
    path.join("C:/Users/tomyb/Downloads/Precios Juguetes - Precios.csv"),
    "utf-8"
  );
  const rows = raw.split(/\r?\n/).slice(4); // skip 4 header rows
  const result = [];
  for (const row of rows) {
    const cols = parseCsvRow(row);
    const name = cols[0]?.trim();
    if (!name) continue;
    const price = parseARS(cols[2]);
    const hoursRaw = cols[3]?.trim();
    const hours = parseNum(hoursRaw);
    const gramsRaw = cols[4]?.trim();
    const grams = parseNum(gramsRaw);
    result.push({
      name,
      price,
      minutes: hours > 0 ? Math.round(hours * 60) : null,
      grams: grams > 0 ? grams : null,
    });
  }
  return result;
}

// ─── Filamentos ──────────────────────────────────────────────────────────────

function detectType(brand: string): FilamentType {
  const b = brand.toLowerCase();
  if (b.includes("petg")) return FilamentType.PETG;
  return FilamentType.PLA;
}

function loadFilamentos(): Array<{ brand: string; color: string; type: FilamentType; stock: number }> {
  const raw = fs.readFileSync(
    path.join("C:/Users/tomyb/Downloads/Filamentos - 2024.csv"),
    "utf-8"
  );
  const rows = raw.split(/\r?\n/).slice(3); // skip 3 header rows
  const result = [];
  for (const row of rows) {
    const cols = row.split(",");
    const brand = cols[0]?.trim();
    const color = cols[1]?.trim();
    if (!brand || !color) continue;
    const stock = parseInt(cols[2]) || 0;
    if (stock <= 0) continue; // skip filamentos sin stock
    result.push({ brand, color, type: detectType(brand), stock });
  }
  return result;
}

// ─── Ventas ──────────────────────────────────────────────────────────────────

interface SaleEntry {
  date: Date;
  lines: Array<{ toyName: string; qty: number }>;
}

function parseDate(col: string): Date | null {
  // "02/01" → 2026-01-02
  const m = col.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const day = parseInt(m[1]);
  const month = parseInt(m[2]);
  const year = month >= 1 && month <= 2 ? 2026 : 2025; // Jan-Feb = 2026
  return new Date(Date.UTC(year, month - 1, day));
}

function loadVentas(): SaleEntry[] {
  const raw = fs.readFileSync(
    path.join("C:/Users/tomyb/Downloads/Ventas - 2026 - N.csv"),
    "utf-8"
  );
  const allRows = raw.split(/\r?\n/);
  const headerRow = allRows[1]; // "Categoria,Nombre,Columna 3,02/01,..."
  const cols = headerRow.split(",");

  // Find date columns (index 3 onward until "|")
  const dateCols: { idx: number; date: Date }[] = [];
  for (let i = 3; i < cols.length; i++) {
    const d = parseDate(cols[i].trim());
    if (!d) break;
    dateCols.push({ idx: i, date: d });
  }

  const salesMap = new Map<string, SaleEntry>();
  for (const { date } of dateCols) {
    salesMap.set(date.toISOString(), { date, lines: [] });
  }

  // Data rows start at index 2
  const dataRows = allRows.slice(2);
  for (const row of dataRows) {
    if (!row.trim()) continue;
    const parts = row.split(",");
    const toyName = parts[1]?.trim();
    if (!toyName || toyName === "Nombre") continue;

    for (const { idx, date } of dateCols) {
      const qtyStr = parts[idx]?.trim();
      const qty = parseInt(qtyStr) || 0;
      if (qty > 0) {
        const entry = salesMap.get(date.toISOString())!;
        entry.lines.push({ toyName, qty });
      }
    }
  }

  return Array.from(salesMap.values()).filter((e) => e.lines.length > 0);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧹 Limpiando datos anteriores...");

  // Borrar en orden FK-safe
  await prisma.issuePart.deleteMany();
  await prisma.partMove.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.miscLine.deleteMany();
  await prisma.saleLine.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.salesDay.deleteMany();
  await prisma.toyPrice.deleteMany();
  await prisma.toy.deleteMany();
  await prisma.filamentBatch.deleteMany();
  await prisma.filamentOrder.deleteMany();
  await prisma.filament.deleteMany();

  console.log("✅ Datos limpios.\n");

  // ── Juguetes ──
  console.log("🎮 Cargando juguetes...");
  const juguetes = loadJuguetes();
  const toyMap = new Map<string, number>(); // name → id

  for (const j of juguetes) {
    const toy = await prisma.toy.create({
      data: {
        name: j.name,
        currentPriceArs: j.price,
        stock: 0,
        active: true,
        printTimeMinutes: j.minutes,
        weightGrams: j.grams,
      },
    });
    if (j.price > 0) {
      await prisma.toyPrice.create({ data: { toyId: toy.id, priceArs: j.price } });
    }
    toyMap.set(j.name.toLowerCase(), toy.id);
    console.log(`  + ${j.name} → $${j.price} | ${j.minutes ?? "—"}min | ${j.grams ?? "—"}g`);
  }
  console.log(`✅ ${juguetes.length} juguetes.\n`);

  // ── Filamentos ──
  console.log("🎞️  Cargando filamentos...");
  const filamentos = loadFilamentos();
  const now = new Date();

  // Crear orden placeholder para stock inicial
  const placeholderOrder = await prisma.filamentOrder.create({
    data: {
      supplier: "Stock inicial",
      date: now,
      shippingArs: 0,
      notes: "Importado desde planilla",
    },
  });

  for (const f of filamentos) {
    const filament = await prisma.filament.create({
      data: { brand: f.brand, color: f.color, type: f.type, active: true },
    });
    // Create N batches (one per roll)
    for (let i = 0; i < f.stock; i++) {
      await prisma.filamentBatch.create({
        data: {
          filamentId: filament.id,
          orderId: placeholderOrder.id,
          gramsTotal: 1000,
          gramsRemaining: 1000,
          purchasePriceArs: 0,
          purchaseDate: now,
          isFinished: false,
        },
      });
    }
    console.log(`  + ${f.brand} ${f.color} (${f.type}) — ${f.stock} rollo${f.stock !== 1 ? "s" : ""}`);
  }
  console.log(`✅ ${filamentos.length} filamentos.\n`);

  // ── Ventas ──
  console.log("💰 Cargando ventas...");
  const ventas = loadVentas();
  let missingToys: Set<string> = new Set();

  for (const venta of ventas) {
    // Resolve toys; create missing ones with price 0
    const resolvedLines: Array<{ toyId: number; qty: number; price: number }> = [];

    for (const { toyName, qty } of venta.lines) {
      let toyId = toyMap.get(toyName.toLowerCase());
      if (!toyId) {
        missingToys.add(toyName);
        // Create on the fly
        const toy = await prisma.toy.create({
          data: { name: toyName, currentPriceArs: 0, stock: 0, active: true },
        });
        toyId = toy.id;
        toyMap.set(toyName.toLowerCase(), toyId);
      }
      const price = await prisma.toy.findUnique({ where: { id: toyId }, select: { currentPriceArs: true } });
      resolvedLines.push({ toyId, qty, price: Number(price?.currentPriceArs ?? 0) });
    }

    const day = await prisma.salesDay.create({
      data: {
        date: venta.date,
        status: "CLOSED",
        closedAt: venta.date,
        notes: "Sol/Nono — importado",
      },
    });

    for (const l of resolvedLines) {
      await prisma.saleLine.create({
        data: {
          salesDayId: day.id,
          toyId: l.toyId,
          quantity: l.qty,
          unitPriceArs: l.price,
        },
      });
    }

    const dateStr = venta.date.toLocaleDateString("es-AR");
    console.log(`  + ${dateStr} — ${resolvedLines.length} items`);
  }

  if (missingToys.size > 0) {
    console.log(`\n⚠️  Juguetes creados nuevos (precio 0 — actualizá en /juguetes):`);
    for (const n of missingToys) console.log(`     • ${n}`);
  }

  console.log(`\n✅ ${ventas.length} días de venta.\n`);
  console.log("🎉 Importación completada.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
