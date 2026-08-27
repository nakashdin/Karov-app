# review-evidence/

Read `scripts/shared/review-evidence-gate.mjs`'s own header before adding a file
here — it explains the invariant, what this gate does and does not prove, and
why the format below is shaped the way it is.

This directory contains nothing except evidence files. One JSON file per
reviewed commit, named by that commit's full 40-character SHA:

```
review-evidence/<full-40-char-lowercase-hex-sha>.json
```

```json
{
  "commit": "<the reviewed commit's full 40-char SHA — must match the filename>",
  "tree": "<that commit's tree hash, e.g. `git rev-parse <sha>^{tree}` — recomputed and checked by the gate, not trusted from this file alone>",
  "reviewer": "<free text>",
  "verdict": "approved",
  "note": "<free text>"
}
```

`verdict` must be exactly `"approved"`. Nothing else satisfies the gate.
