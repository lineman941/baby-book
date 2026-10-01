# TikTok content pipeline

What you asked for: a system where the work happens on its own, and you
approve content and watch ad spend. This is that system, scoped to what is
actually possible from where I run. Read the "what this can't do" section
before trusting it with anything — it's there so you don't find out from a
suspended account instead of from me.

## What's automated, end to end

1. **`scenes.json`** — a bank of recipes. Each one maps a script from
   `marketing-kit/tiktok-scripts.md` to concrete app actions (which tab,
   what to type, how long to hold a shot) and carries its own caption,
   title and hashtags.
2. **`record.js <scene-id> <out-dir>`** — drives the real built product
   (`dist/OurLittleMiracle.html`) in a headless browser, seeds it with
   realistic data so the clip never shows an empty book, and records a
   vertical screen capture.
3. **`encode.sh <raw.webm> <out.mp4>`** — converts that into TikTok/Etsy
   spec: 720x1280, h264, faststart, capped at 14s, silent (music is added
   at publish time, not baked in, so it's never a copyright strike risk on
   the file itself).
4. **Upload + prepare** — the encoded file gets uploaded to Higgsfield and
   a TikTok publish session is opened with the scene's title/caption
   pre-filled. This is scriptable the same way the first post was done in
   chat; see `queue.json` for what's been generated and what's still
   waiting.

Run a scene:
```
node tools/content-pipeline/record.js 2 tools/content-pipeline/out
bash tools/content-pipeline/encode.sh tools/content-pipeline/out/*.webm tools/content-pipeline/out/scene2.mp4
```

## What requires you, every single time, and why

TikTok's own publish API will not let anyone skip these — they're not a
limitation I imposed, they're required fields on the platform's own form:

- **Privacy level** (public / friends / only me)
- **Commercial content disclosure** — because this is a product ad, it
  legally has to be labelled, and only the account owner can make that
  declaration
- **Comment/duet/stitch settings**
- **Picking (or declining) a trending audio track**

I will draft all of it and hand you a specific choice to confirm, the way
I did for the first post. I will not auto-publish past that gate. An
automated system that posts to your TikTok without you looking at it
first is a worse system, not a better one — one bad caption or a wrongly
declared disclosure is how accounts get suspended, and yours just came
back from that.

**Practically: I generate the batch, you get one message per clip
("here's #5, here's the caption, pick privacy and I'll post it"), and
that's the whole approval step.** It's a few taps, not a review meeting.

## What this pipeline cannot touch at all

Verified by testing the actual network connection, not assumed:

- **Etsy, Pinterest, Facebook** — outbound connections to their APIs are
  blocked at the proxy level from this environment (confirmed 403 policy
  denials on all three). No agent, however built, changes that from here.
  Pinterest posting stays manual — the 22 pins in `marketing-kit/pins/`
  are the asset, posting them is on you or whoever runs the account.
- **Ad spend monitoring** — there is no ad campaign running on any
  platform right now. Nothing to monitor yet. If you start running paid
  ads (TikTok Ads Manager, Pinterest ads), that needs its own connected
  account before any dashboard here means anything real. Don't let anyone
  show you a "spend tracker" with no ad account wired into it — it would
  be decoration, not data.

## Scene bank status

4 recipes built and one (`#2`) proven end-to-end: recorded, encoded,
frame-checked by hand. The rest of the 30-script bank can get recipes the
same way, a few at a time, as you work through them — each one takes
about the same effort as #2 took here.

| id | hook | status |
|----|------|--------|
| 2  | POV: you actually kept up with the baby book | recipe built + proven |
| 3  | The baby book for moms who lose the baby book | recipe built |
| 5  | Watch this chart draw my baby's growth | recipe built |
| 17 | Writing a letter she'll read at 18 | recipe built |

Scripts needing something outside the app itself (a checkout flow, a
side-by-side with competitor products, a literal stopwatch overlay) don't
get a recipe here — they need a real phone-in-hand shot, which is still
yours to film 30 seconds of whenever you want one.
