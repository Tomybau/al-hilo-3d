import { describe, expect, it } from "vitest";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/password";
// El hash del script que corre en la imagen de produccion, en JS plano.
import { hashPassword as hashFromBootstrap } from "../scripts/lib/password-hash.mjs";

describe("hashPassword / verifyPassword", () => {
  it("verifica la contrasena correcta y rechaza una incorrecta", async () => {
    const hash = await hashPassword("una-clave-larga");
    expect(await verifyPassword("una-clave-larga", hash)).toBe(true);
    expect(await verifyPassword("una-clave-largA", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("usa sal aleatoria: la misma contrasena da hashes distintos", async () => {
    const a = await hashPassword("misma-clave");
    const b = await hashPassword("misma-clave");
    expect(a).not.toBe(b);
    expect(await verifyPassword("misma-clave", a)).toBe(true);
    expect(await verifyPassword("misma-clave", b)).toBe(true);
  });

  it("guarda los parametros dentro del hash", async () => {
    const hash = await hashPassword("x".repeat(10));
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  });

  it("un usuario sin contrasena nunca puede entrar", async () => {
    expect(await verifyPassword("cualquiera", null)).toBe(false);
    expect(await verifyPassword("cualquiera", undefined)).toBe(false);
    expect(await verifyPassword("", null)).toBe(false);
  });

  it("un hash corrupto no autentica ni explota", async () => {
    for (const bad of ["", "texto", "scrypt$1$2$3", "bcrypt$a$b$c$d$e", "scrypt$x$8$1$AAAA$BBBB"]) {
      expect(await verifyPassword("algo", bad)).toBe(false);
    }
  });

  it("rechaza contrasenas absurdamente largas sin calcular el hash", async () => {
    const hash = await hashPassword("normal-1234");
    expect(await verifyPassword("a".repeat(10_000), hash)).toBe(false);
  });

  it("tarda parecido con usuario inexistente que con contrasena incorrecta", async () => {
    // Si "no existe" respondiera instantaneo, el tiempo revelaria que nombres existen.
    const hash = await hashPassword("clave-real-123");
    const t0 = performance.now();
    await verifyPassword("intento", hash);
    const wrongPassword = performance.now() - t0;
    const t1 = performance.now();
    await verifyPassword("intento", null);
    const noUser = performance.now() - t1;
    expect(noUser).toBeGreaterThan(wrongPassword * 0.3);
  });
});

describe("compatibilidad con scripts/bootstrap.mjs", () => {
  it("un hash generado por el bootstrap valida en la app", async () => {
    // El bootstrap reimplementa el hash en JS plano porque corre en la imagen de
    // produccion. Si los formatos divergen, el admin creado al desplegar no podria
    // iniciar sesion nunca. Este test es la red de seguridad.
    const hash = await hashFromBootstrap("clave-del-admin");
    expect(await verifyPassword("clave-del-admin", hash)).toBe(true);
    expect(await verifyPassword("otra", hash)).toBe(false);
  });

  it("los dos producen exactamente el mismo formato", async () => {
    const fromApp = (await hashPassword("x".repeat(10))).split("$").slice(0, 4);
    const fromScript = (await hashFromBootstrap("x".repeat(10))).split("$").slice(0, 4);
    expect(fromScript).toEqual(fromApp);
  });
});

describe("validatePasswordStrength", () => {
  it("exige al menos 8 caracteres", () => {
    expect(validatePasswordStrength("1234567")).toMatch(/8/);
    expect(validatePasswordStrength("12345678")).toBeNull();
  });
  it("rechaza contrasenas enormes", () => {
    expect(validatePasswordStrength("a".repeat(201))).not.toBeNull();
  });
});
