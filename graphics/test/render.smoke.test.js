import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { renderPostImage } from "../render.js";

test("renderPostImage tworzy lokalny plik PNG", async () => {
  const result = await renderPostImage(
    {
      postType: "TEST",
      headline: "Test rendera",
      subheadline: "Podglad",
      bodyPoints: ["A", "B", "C"],
    },
    { upload: false },
  );

  assert.ok(result.localPath);
  const stat = await fs.stat(result.localPath);
  assert.ok(stat.size > 0);
});

