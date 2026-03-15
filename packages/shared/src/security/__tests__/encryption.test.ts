import { describe, it, expect, beforeEach } from "vitest";
import { encrypt, decrypt, hashForLookup } from "../encryption.js";

describe("encryption", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-at-least-16-chars";
  });

  it("should encrypt and decrypt a string", async () => {
    const plaintext = "Hello, World!";
    const encrypted = await encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.split(":")).toHaveLength(4);

    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertexts for the same plaintext", async () => {
    const plaintext = "Same text";
    const a = await encrypt(plaintext);
    const b = await encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it("should handle empty strings", async () => {
    const plaintext = "";
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should handle unicode", async () => {
    const plaintext = "Hello 🌍 Wörld こんにちは";
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should handle long strings", async () => {
    const plaintext = "x".repeat(10000);
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should fail to decrypt with wrong format", async () => {
    await expect(decrypt("invalid")).rejects.toThrow("Invalid ciphertext format");
  });

  it("should fail to decrypt tampered ciphertext", async () => {
    const encrypted = await encrypt("test");
    const parts = encrypted.split(":");
    parts[3] = "AAAA" + (parts[3]?.slice(4) ?? "");
    await expect(decrypt(parts.join(":"))).rejects.toThrow();
  });

  it("should throw if ENCRYPTION_KEY is not set", async () => {
    delete process.env.ENCRYPTION_KEY;
    await expect(encrypt("test")).rejects.toThrow("ENCRYPTION_KEY must be set");
  });
});

describe("hashForLookup", () => {
  it("should produce consistent hashes", () => {
    const hash1 = hashForLookup("test@example.com");
    const hash2 = hashForLookup("test@example.com");
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different inputs", () => {
    const hash1 = hashForLookup("a");
    const hash2 = hashForLookup("b");
    expect(hash1).not.toBe(hash2);
  });

  it("should return a 64-char hex string", () => {
    const hash = hashForLookup("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
