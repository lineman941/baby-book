# Working rules for this project (Our Little Miracle)

## RULE #1 — NEVER GUESS. VERIFY.
Set by the owner, non-negotiable. Applies to every session, every agent.

- Do **not** state that something works, exists, is fixed, or is broken unless
  it has just been checked against the actual file or a real browser run.
- Do **not** describe a feature from memory or assumption. Grep it, read it,
  or drive it in Playwright first.
- If something cannot be verified here (real iPhone behaviour, live Etsy
  posting, whether a buyer's browser keeps data), say plainly that it is
  **unverified** rather than implying it was tested.
- No invented marketing claims. Every feature named in listing copy, pins, or
  the landing page must exist in `app.html` / `app.js`. Verified with a grep,
  not from recall.
- If a step fails (a download blocked, an asset missing), **stop and say so**.
  Do not paper over it with placeholder files.

## RULE #2 — Don't spend the owner's money without being asked.
Paid image/video generation (Higgsfield etc.) burned real credits for no usable
result once already. Do not call any paid generation tool unless the owner asks
for it in that message.

## Which file is the product
- `dist/OurLittleMiracle.html` — **the real product.** Fully self-contained,
  works offline from `file://`. This is what buyers get and what to test.
- `app.html` — source view only. It needs its sibling stylesheet, script, font
  and asset folders; opened alone it shows a "this is not the finished book"
  notice by design.
- `index.html` — the storefront landing page (needs siblings; served by Pages).
- Rebuild the product after any source change: `python3 build-product.py`
  (needs `pip install -r requirements.txt`).

## Verify before claiming done
Drive the built file in Playwright at 390px: navigation, photo upload,
persistence across reload, growth chart, backup/restore, page-flip cleanup,
and no horizontal overflow at 360 / 390 / 430 px.
