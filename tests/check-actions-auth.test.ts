/**
 * El chequeo que impide volver a publicar una Server Action sin proteccion.
 * Corre dentro de `npm run build`; si deja de detectar el problema, el build pasa
 * con un agujero adentro.
 */
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve(__dirname, "../scripts/check-actions-auth.mjs");

function runIn(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "check-auth-"));
  for (const [rel, content] of Object.entries(files)) {
    const path = join(dir, rel);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
  }
  return spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8" });
}

describe("check-actions-auth", () => {
  it("pasa sobre el codigo real del repo", () => {
    const result = spawnSync(process.execPath, [SCRIPT], { cwd: resolve(__dirname, ".."), encoding: "utf8" });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("falla con una accion exportada sin requireUser", () => {
    const result = runIn({
      "src/server/actions/x.ts": '"use server";\n\nexport async function borrarTodo() {\n  return 1;\n}\n',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("borrarTodo");
  });

  it("falla si requireUser esta abajo de todo y no al principio", () => {
    const result = runIn({
      "src/server/actions/x.ts":
        '"use server";\n\nexport async function tarde() {\n  const a = 1;\n  const b = 2;\n  const c = 3;\n  await requireUser();\n}\n',
    });
    expect(result.status).toBe(1);
  });

  it("acepta la accion protegida, aunque tenga comentarios antes", () => {
    const result = runIn({
      "src/server/actions/x.ts":
        '"use server";\n\nexport async function ok(fd: FormData) {\n  // comentario\n  await requireUser();\n  return 1;\n}\n',
    });
    expect(result.status).toBe(0);
  });

  it("acepta `const me = await requireUser()`", () => {
    const result = runIn({
      "src/server/actions/x.ts": '"use server";\n\nexport async function ok() {\n  const me = await requireUser();\n}\n',
    });
    expect(result.status).toBe(0);
  });

  it("detecta acciones inline sin proteccion en una pagina", () => {
    const result = runIn({
      "src/app/x/page.tsx":
        'export default function P() {\n  return <form action={async (fd) => {\n    "use server";\n    await borrar(fd);\n  }} />;\n}\n',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("inline");
  });

  it("funciona con finales de linea CRLF (asi quedan los archivos en Windows)", () => {
    const result = runIn({
      "src/server/actions/x.ts": '"use server";\r\n\r\nexport async function sinCheck() {\r\n  return 1;\r\n}\r\n',
    });
    expect(result.status).toBe(1);
  });

  it("rechaza acciones declaradas como const", () => {
    const result = runIn({
      "src/server/actions/x.ts": '"use server";\n\nexport const escondida = async () => 1;\n',
    });
    expect(result.status).toBe(1);
  });
});
