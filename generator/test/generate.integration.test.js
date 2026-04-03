import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGeneratedPayload, parseClaudeJson } from "../prompts.js";

test("parseClaudeJson obsluguje plain JSON i code block", () => {
  const raw = "```json\n{\"caption\":\"x\",\"tags\":[\"#a\"],\"slides\":[{\"title\":\"t\",\"body\":\"b\"}]}\n```";
  const parsed = parseClaudeJson(raw);
  assert.equal(parsed.caption, "x");
});

test("normalizeGeneratedPayload normalizuje indeksy i tagi", () => {
  const normalized = normalizeGeneratedPayload({
    caption: "opis",
    tags: ["#ok", "bad"],
    slides: [
      { title: "A", body: "B" },
      { title: "C", body: "D" },
    ],
  });

  assert.equal(normalized.tags.length, 1);
  assert.equal(normalized.slides[0].index, 1);
  assert.equal(normalized.slides[1].index, 2);
});

