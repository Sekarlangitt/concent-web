import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";

import {
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/session-token";
import { SESSION_TOKEN_ALGORITHM } from "@/lib/auth/config";

/**
 * Token-level tests (STEP 9, requirements 55–57): a valid session succeeds,
 * and missing/malformed/tampered/expired/altered-algorithm sessions all fail.
 */

const SECRET = "unit-test-secret-0123456789-abcdefghijklmnop";
const OTHER_SECRET = "unit-test-other-secret-0123456789-abcdefgh";
const ADMIN = {
  adminId: "cm_123",
  username: "admin",
  email: "admin@president.ac.id",
};

describe("signSessionToken / verifySessionToken", () => {
  it("verifies a freshly signed, unexpired session", async () => {
    const token = await signSessionToken(ADMIN, SECRET, 3600);
    const session = await verifySessionToken(token, SECRET);

    expect(session).not.toBeNull();
    expect(session).toEqual(ADMIN);
  });

  it("treats a missing or empty token as unauthenticated", async () => {
    expect(await verifySessionToken("", SECRET)).toBeNull();
  });

  it("treats a malformed (non-JWT) token as unauthenticated", async () => {
    expect(await verifySessionToken("not-a-real-token", SECRET)).toBeNull();
    expect(
      await verifySessionToken("aaa.bbb.ccc", SECRET),
    ).toBeNull();
  });

  it("rejects a tampered token (modified payload)", async () => {
    const token = await signSessionToken(ADMIN, SECRET, 3600);
    const [header, , signature] = token.split(".");

    // Flip one character in the payload section; signature no longer matches.
    const tamperedPayload = JSON.stringify({
      adminId: "cm_EVIL",
      email: ADMIN.email,
    });
    const tampered = [
      header,
      Buffer.from(tamperedPayload).toString("base64url"),
      signature,
    ].join(".");

    expect(await verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it("rejects a token whose signature bytes were modified", async () => {
    const token = await signSessionToken(ADMIN, SECRET, 3600);
    const suffix = token.slice(-4);
    const tampered = token.slice(0, -4) + (suffix === "AAAA" ? "BBBB" : "AAAA");

    expect(await verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const alreadyExpired = await signSessionToken(ADMIN, SECRET, -10);
    expect(await verifySessionToken(alreadyExpired, SECRET)).toBeNull();

    // Also verify via jose directly with a past exp claim.
    const explicitPastExp = await new SignJWT({
      adminId: ADMIN.adminId,
      email: ADMIN.email,
    })
      .setProtectedHeader({ alg: SESSION_TOKEN_ALGORITHM })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifySessionToken(explicitPastExp, SECRET)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signSessionToken(ADMIN, OTHER_SECRET, 3600);
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it("rejects a token signed with a non-HS256 algorithm (algorithm is fixed)", async () => {
    const wrongAlg = await new SignJWT({
      adminId: ADMIN.adminId,
      email: ADMIN.email,
    })
      .setProtectedHeader({ alg: "HS384" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifySessionToken(wrongAlg, SECRET)).toBeNull();
  });

  it("rejects a structurally valid token missing required claims", async () => {
    const missingEmail = await new SignJWT({ adminId: ADMIN.adminId })
      .setProtectedHeader({ alg: SESSION_TOKEN_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifySessionToken(missingEmail, SECRET)).toBeNull();
  });

  it("rejects verification when the secret is empty", async () => {
    const token = await signSessionToken(ADMIN, SECRET, 3600);
    expect(await verifySessionToken(token, "")).toBeNull();
  });
});
