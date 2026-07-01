import "server-only";
import { cookies } from "next/headers";
import { encrypt, decrypt, SessionPayload } from "./session";

const COOKIE_NAME = "ecotruck-rt-session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function createSession(data: SessionPayload) {
  const token = await encrypt(data);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decrypt(token);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
