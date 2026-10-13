import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_FAILURES,
  WINDOW_MS,
  _resetRateLimit,
  clearFailures,
  registerFailure,
  retryAfterSeconds,
} from "@/lib/rate-limit";

const NOW = 1_000_000;
const keys = ["ip:1.2.3.4", "user:tomas"];

describe("limite de intentos de login", () => {
  beforeEach(() => _resetRateLimit());

  it(`permite hasta ${MAX_FAILURES} fallos y despues bloquea`, () => {
    for (let i = 0; i < MAX_FAILURES - 1; i++) {
      registerFailure(keys, NOW);
      expect(retryAfterSeconds(keys, NOW)).toBe(0);
    }
    registerFailure(keys, NOW);
    expect(retryAfterSeconds(keys, NOW)).toBeGreaterThan(0);
  });

  it("bloquea por usuario aunque el atacante cambie de IP", () => {
    for (let i = 0; i < MAX_FAILURES; i++) {
      registerFailure([`ip:10.0.0.${i}`, "user:tomas"], NOW);
    }
    expect(retryAfterSeconds(["ip:10.0.0.99", "user:tomas"], NOW)).toBeGreaterThan(0);
    // Otro usuario desde una IP limpia no se ve afectado.
    expect(retryAfterSeconds(["ip:10.0.0.99", "user:otro"], NOW)).toBe(0);
  });

  it("bloquea por IP aunque se prueben usuarios distintos", () => {
    for (let i = 0; i < MAX_FAILURES; i++) {
      registerFailure(["ip:6.6.6.6", `user:u${i}`], NOW);
    }
    expect(retryAfterSeconds(["ip:6.6.6.6", "user:nuevo"], NOW)).toBeGreaterThan(0);
  });

  it("el bloqueo vence al terminar la ventana", () => {
    for (let i = 0; i < MAX_FAILURES; i++) registerFailure(keys, NOW);
    expect(retryAfterSeconds(keys, NOW + WINDOW_MS - 1000)).toBeGreaterThan(0);
    expect(retryAfterSeconds(keys, NOW + WINDOW_MS + 1)).toBe(0);
  });

  it("un login exitoso limpia los contadores", () => {
    for (let i = 0; i < MAX_FAILURES - 1; i++) registerFailure(keys, NOW);
    clearFailures(keys);
    for (let i = 0; i < MAX_FAILURES - 1; i++) registerFailure(keys, NOW);
    expect(retryAfterSeconds(keys, NOW)).toBe(0);
  });
});
