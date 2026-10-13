/**
 * Tests de la cookie de sesion.
 *
 * Cubren justo lo que el middleware anterior NO hacia: verificar la firma. Antes
 * alcanzaba con mandar `alh_user=x` para leer todas las paginas e invocar acciones.
 */
import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "@/lib/session";

const SECRET = "a".repeat(64);
const OTHER_SECRET = "b".repeat(64);
const NOW = 1_800_000_000_000;

async function sign(userId = 7, version = 0, issuedAt = NOW) {
  return signSession({ userId, version, issuedAt }, SECRET);
}

describe("verifySession", () => {
  it("acepta una cookie recien firmada", async () => {
    const cookie = await sign();
    expect(await verifySession(cookie, { now: NOW, secret: SECRET })).toEqual({
      userId: 7,
      version: 0,
      issuedAt: NOW,
    });
  });

  it("rechaza la cookie con el formato viejo (alh_user = id.firma)", async () => {
    // El formato anterior tenia 2 partes. Tiene que quedar invalido sin mas.
    expect(await verifySession("7.deadbeef", { now: NOW, secret: SECRET })).toBeNull();
  });

  it("rechaza cualquier valor inventado", async () => {
    for (const raw of ["x", "", "1", "1.0.0.0", "a.b.c.d", "7.0.1800000000000.zz"]) {
      expect(await verifySession(raw, { now: NOW, secret: SECRET })).toBeNull();
    }
  });

  it("rechaza si se cambia el usuario manteniendo la firma", async () => {
    // El ataque concreto: tomar MI cookie y cambiar el id por el de otra persona.
    const cookie = await sign(7);
    const forged = cookie.replace(/^7\./, "1.");
    expect(await verifySession(forged, { now: NOW, secret: SECRET })).toBeNull();
  });

  it("rechaza si se cambia la version para revivir una sesion invalidada", async () => {
    const cookie = await sign(7, 0);
    const forged = cookie.replace(/^7\.0\./, "7.5.");
    expect(await verifySession(forged, { now: NOW, secret: SECRET })).toBeNull();
  });

  it("rechaza si se extiende la fecha de emision para que no venza", async () => {
    const cookie = await sign(7, 0, NOW - 40 * 86_400_000);
    const forged = cookie.replace(String(NOW - 40 * 86_400_000), String(NOW));
    expect(await verifySession(forged, { now: NOW, secret: SECRET })).toBeNull();
  });

  it("rechaza una firma hecha con otro secreto", async () => {
    const cookie = await signSession({ userId: 7, version: 0, issuedAt: NOW }, OTHER_SECRET);
    expect(await verifySession(cookie, { now: NOW, secret: SECRET })).toBeNull();
  });

  it("vence a los 30 dias", async () => {
    const cookie = await sign();
    const max = SESSION_MAX_AGE_SECONDS * 1000;
    expect(await verifySession(cookie, { now: NOW + max - 1000, secret: SECRET })).not.toBeNull();
    expect(await verifySession(cookie, { now: NOW + max + 1000, secret: SECRET })).toBeNull();
  });

  it("rechaza una cookie emitida en el futuro (mas alla de la tolerancia de reloj)", async () => {
    const cookie = await sign(7, 0, NOW + 10 * 60_000);
    expect(await verifySession(cookie, { now: NOW, secret: SECRET })).toBeNull();
  });

  it("tolera un reloj levemente adelantado", async () => {
    const cookie = await sign(7, 0, NOW + 30_000);
    expect(await verifySession(cookie, { now: NOW, secret: SECRET })).not.toBeNull();
  });

  it("rechaza userId 0 y valores absurdamente largos", async () => {
    const zero = await signSession({ userId: 0, version: 0, issuedAt: NOW }, SECRET);
    expect(await verifySession(zero, { now: NOW, secret: SECRET })).toBeNull();
    expect(await verifySession("1".repeat(500), { now: NOW, secret: SECRET })).toBeNull();
  });
});

describe("getSessionSecret en produccion", () => {
  it("falla cerrado si el secreto falta, es corto o es el de ejemplo", async () => {
    const { getSessionSecret } = await import("@/lib/session");
    const prev = { env: process.env.NODE_ENV, secret: process.env.COOKIE_SECRET };
    try {
      (process.env as Record<string, string>).NODE_ENV = "production";

      delete process.env.COOKIE_SECRET;
      expect(() => getSessionSecret()).toThrow(/COOKIE_SECRET/);

      process.env.COOKIE_SECRET = "corto";
      expect(() => getSessionSecret()).toThrow(/COOKIE_SECRET/);

      process.env.COOKIE_SECRET = "change-me-to-a-long-random-string-xxxxxxxxxxxx";
      expect(() => getSessionSecret()).toThrow(/COOKIE_SECRET/);

      process.env.COOKIE_SECRET = "f".repeat(64);
      expect(getSessionSecret()).toBe("f".repeat(64));
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prev.env;
      if (prev.secret === undefined) delete process.env.COOKIE_SECRET;
      else process.env.COOKIE_SECRET = prev.secret;
    }
  });
});
