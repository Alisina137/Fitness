import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  parseToken,
} from "../../src/lib/auth.js";

describe("hashPassword / verifyPassword", () => {
  it("produces a salt:hash formatted string", () => {
    const stored = hashPassword("s3cret");
    const [salt, hash] = stored.split(":");
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("uses a random salt so two hashes of the same password differ", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("verifies a correct password", () => {
    const stored = hashPassword("correct-horse");
    expect(verifyPassword("correct-horse", stored)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const stored = hashPassword("correct-horse");
    expect(verifyPassword("wrong", stored)).toBe(false);
  });
});

describe("generateToken / parseToken", () => {
  it("round-trips a user id", () => {
    const token = generateToken(42);
    expect(parseToken(token)).toEqual({ userId: 42 });
  });

  it("produces a unique token per call", () => {
    expect(generateToken(1)).not.toBe(generateToken(1));
  });

  it("returns null for malformed base64 / json", () => {
    expect(parseToken("not-a-real-token")).toBeNull();
  });

  it("returns null when the payload lacks a numeric userId", () => {
    const bad = Buffer.from(JSON.stringify({ userId: "abc" })).toString(
      "base64",
    );
    expect(parseToken(bad)).toBeNull();
  });
});
