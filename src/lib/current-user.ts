import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./db";

const COOKIE_NAME = "alh_user";
const SECRET = process.env.COOKIE_SECRET ?? "dev-secret-change-me";

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

function pack(userId: number): string {
  const v = String(userId);
  return `${v}.${sign(v)}`;
}

function unpack(raw: string | undefined): number | null {
  if (!raw) return null;
  const [v, sig] = raw.split(".");
  if (!v || !sig) return null;
  const expected = sign(v);
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }
  const id = Number(v);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function getCurrentUser() {
  const c = await cookies();
  const id = unpack(c.get(COOKIE_NAME)?.value);
  if (!id) return null;
  return prisma.user.findUnique({ where: { id, active: true } });
}

export async function getCurrentUserId(): Promise<number | null> {
  const c = await cookies();
  return unpack(c.get(COOKIE_NAME)?.value);
}

export async function setCurrentUser(userId: number) {
  const c = await cookies();
  c.set(COOKIE_NAME, pack(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

export async function clearCurrentUser() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export const USER_COOKIE_NAME = COOKIE_NAME;
