/**
 * El parametro `?next=` despues del login. La version anterior aceptaba cualquier cosa
 * que empezara con "/", lo que deja pasar `//sitio-externo.com`.
 */
import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-redirect";

describe("safeNext", () => {
  it("acepta rutas internas", () => {
    for (const ok of ["/", "/ventas", "/ventas/12", "/finanzas?from=2026-01-01", "/configuracion?tab=cuenta"]) {
      expect(safeNext(ok)).toBe(ok);
    }
  });

  it("rechaza URLs absolutas y relativas al protocolo", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "//evil.com/ventas",
      "/\\evil.com",
      "\\\\evil.com",
      "javascript:alert(1)",
      "ventas",
    ]) {
      expect(safeNext(bad)).toBe("/");
    }
  });

  it("rechaza caracteres de control que el navegador descarta", () => {
    // "/\t/evil.com": el parser de URL elimina el tab y queda "//evil.com".
    for (const bad of ["/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\x00/x"]) {
      expect(safeNext(bad)).toBe("/");
    }
  });

  it("no redirige de vuelta al login (loop)", () => {
    expect(safeNext("/login")).toBe("/");
    expect(safeNext("/login?next=/ventas")).toBe("/");
  });

  it("ignora valores que no son texto", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext(42)).toBe("/");
    // FormData.get() puede devolver un archivo en lugar de texto.
    expect(safeNext(new Blob([]))).toBe("/");
  });

  it("respeta el fallback indicado", () => {
    expect(safeNext("//evil.com", "/inicio")).toBe("/inicio");
  });
});
