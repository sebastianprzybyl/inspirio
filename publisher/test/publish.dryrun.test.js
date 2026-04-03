import test from "node:test";
import assert from "node:assert/strict";
import { buildCaption } from "../instagram.js";

test("buildCaption laczy caption i hashtagi", () => {
  const caption = buildCaption("Opis", ["#a", "#b"]);
  assert.equal(caption, "Opis\n\n#a\n\n#b");
});

test("buildCaption przycina do limitu IG", () => {
  const long = "x".repeat(2300);
  const caption = buildCaption(long, []);
  assert.equal(caption.length, 2200);
});

