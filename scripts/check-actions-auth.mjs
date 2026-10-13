#!/usr/bin/env node
/**
 * Verifica que TODA Server Action arranque validando la sesion.
 *
 * Por que existe: en un archivo "use server", cada funcion exportada es un endpoint
 * publico que cualquiera puede invocar con un POST, aunque parezca una funcion
 * interna. Asi se colaron dos agujeros en este repo:
 *   - `createUser` era publica y te dejaba logueado.
 *   - `getSettings` (codigo muerto) devolvia toda la configuracion a quien la llamara.
 *
 * Corre dentro de `npm run build`, asi que una accion nueva sin proteccion hace
 * fallar la construccion de la imagen en vez de llegar a produccion.
 *
 * Uso: node scripts/check-actions-auth.mjs
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Las UNICAS acciones que pueden no tener sesion. Agregar una aca es una decision
 * de seguridad: tiene que haber una razon escrita.
 */
const PUBLIC_ACTIONS = new Map([
  ["src/server/actions/auth.ts#login", "es el inicio de sesion"],
  ["src/server/actions/auth.ts#logout", "tiene que funcionar con la sesion vencida"],
]);

/** Cuantas lineas de cuerpo se miran: el chequeo tiene que estar ARRIBA de todo. */
const MAX_LINES_TO_CHECK = 3;

const GUARD = /await\s+requireUser\(\)/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      yield* walk(path);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      yield path;
    }
  }
}

/** Las primeras N lineas con codigo despues de `startIndex`, salteando comentarios. */
function firstCodeLines(lines, startIndex, count) {
  const out = [];
  for (let i = startIndex; i < lines.length && out.length < count; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) continue;
    out.push(line);
  }
  return out;
}

const root = process.cwd();
const problems = [];
let checked = 0;

for (const file of walk(join(root, "src"))) {
  const rel = relative(root, file).replaceAll("\\", "/");
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const isActionFile = /^\s*["']use server["'];?/.test(text);

  lines.forEach((line, index) => {
    // 1) Funciones exportadas de un archivo "use server".
    if (isActionFile) {
      const match = line.match(/^export\s+async\s+function\s+([A-Za-z0-9_]+)/);
      if (match) {
        checked++;
        const key = `${rel}#${match[1]}`;
        if (PUBLIC_ACTIONS.has(key)) return;
        const body = firstCodeLines(lines, index + 1, MAX_LINES_TO_CHECK);
        if (!body.some((l) => GUARD.test(l))) {
          problems.push(`${rel}:${index + 1}  ${match[1]}() no arranca con \`await requireUser()\``);
        }
      }
      // `export const x = async ...` en un archivo de acciones tambien es un endpoint.
      if (/^export\s+const\s+[A-Za-z0-9_]+\s*=\s*async/.test(line)) {
        problems.push(`${rel}:${index + 1}  accion declarada como const: usar \`export async function\``);
      }
    }

    // 2) Acciones inline: un "use server" dentro del cuerpo de una funcion.
    if (!isActionFile && /^\s+["']use server["'];?\s*$/.test(line)) {
      checked++;
      const body = firstCodeLines(lines, index + 1, MAX_LINES_TO_CHECK);
      if (!body.some((l) => GUARD.test(l))) {
        problems.push(`${rel}:${index + 1}  accion inline sin \`await requireUser()\``);
      }
    }
  });
}

if (problems.length > 0) {
  console.error(`\nServer Actions sin proteccion (${problems.length}):\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    "\nCada Server Action es un endpoint publico. Agregá `await requireUser();` como primera linea.\n" +
      "Si de verdad tiene que ser publica, sumala a PUBLIC_ACTIONS en este script con la razon.\n",
  );
  process.exit(1);
}

console.log(`✓ ${checked} Server Actions verificadas, todas exigen sesion (excepto ${PUBLIC_ACTIONS.size} publicas a proposito).`);
