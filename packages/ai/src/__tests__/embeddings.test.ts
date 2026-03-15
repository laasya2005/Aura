import { describe, it, expect } from "vitest";
import { generateEmbedding, cosineSimilarity } from "../embeddings.js";

describe("Embeddings", () => {
  describe("generateEmbedding", () => {
    it("should return a 256-dimension vector", async () => {
      const embedding = await generateEmbedding("Hello world");
      expect(embedding).toHaveLength(256);
    });

    it("should return normalized vector", async () => {
      const embedding = await generateEmbedding("Test input");
      const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it("should produce different embeddings for different texts", async () => {
      const a = await generateEmbedding("I love running in the morning");
      const b = await generateEmbedding("Database optimization techniques");
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeLessThan(0.8);
    });

    it("should produce similar embeddings for related texts", async () => {
      const a = await generateEmbedding("I went for a morning run today");
      const b = await generateEmbedding("I ran this morning for exercise");
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeGreaterThan(0.3);
    });
  });

  describe("cosineSimilarity", () => {
    it("should return 1 for identical vectors", () => {
      const v = [1, 0, 0, 0];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1);
    });

    it("should return 0 for orthogonal vectors", () => {
      const a = [1, 0, 0, 0];
      const b = [0, 1, 0, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0);
    });

    it("should return 0 for mismatched lengths", () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });
  });
});
