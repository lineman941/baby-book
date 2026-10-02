---
name: ai-tools-setup
description: >-
  Set up and tailor the Desktop Commander AI tool for the "Our Little Miracle"
  baby-memory-book business. Use when configuring Desktop Commander on a new
  machine, onboarding the business to a fresh computer, scoping which folders
  and commands Claude may touch, or verifying the setup before a build/sales
  session. Covers the owner's Windows PC and the cloud dev sandbox, the exact
  Python (Pillow) + Node + Git toolchain the build/render pipeline needs, and
  the safety scoping that protects the product source and marketing assets.
---

# AI Tools Setup — Our Little Miracle

This skill configures **Desktop Commander** (the MCP server behind the
`desktop-commander` plugin, which gives Claude terminal + filesystem control)
for **Our Little Miracle** — a solo, zero-cost digital baby-memory-book
business that sells a self-contained HTML product via Payhip and Etsy.

Read `BUSINESS.md` at the repo root for the full business record. The short
version that drives this setup:

- **Solo operator, $0 fixed cost.** No team, no shared servers. The whole
  business is this Git repo plus a couple of local asset folders.
- **The product is built locally**, not on a server: `build-product.py`
  inlines everything into `dist/OurLittleMiracle.html`. That build, and the
  marketing-image render scripts, are the only "infrastructure."
- **The assets are the business.** The 12 illustrated brand images, listing
  images, and marketing content are irreplaceable and un-versioned outside
  this repo. Setup must scope file access to protect them, not expose the
  whole disk.

Because there is no ops team and no backups beyond Git, the goal of this setup
is: **let Claude run the real build/render/sales workflows smoothly, while
keeping file operations scoped to the business's actual folders and blocking
the handful of executables that could wipe the machine or the assets.**

## What Desktop Commander needs to run for this business

The day-to-day work is all local commands. Whatever machine you set up must
have these, and `allowedDirectories` must include the folders they touch:

| Workflow | Command | Tool needed | Reads / writes |
| --- | --- | --- | --- |
| Build the sellable product | `python3 build-product.py` | Python 3 + Pillow (`pip install -r requirements.txt`) | reads repo root, `assets/`, `vendor/`; writes `dist/` |
| Slice generated sprite sheets into accents | `python3 slice-accents.py` | Python 3 + Pillow | reads `asset-inbox/`; writes `assets/` |
| Render Pinterest pins | `node marketing-kit/pins/render-pins.js` | Node 18+ | reads `marketing-kit/pins/`; writes `marketing-kit/pins/images/` |
| Render listing images | `node sales-kit/render-listing-images.js` | Node 18+ | reads `sales-kit/`; writes `sales-kit/images/` |
| Version control / publish to GitHub Pages | `git …` | Git | the repo |
| Etsy API control panel | open `etsy-dashboard.html` | browser only | — |

If any of Python 3, Pillow, Node, or Git is missing, install it **before**
telling the user the setup is done — a config that points at a toolchain the
machine doesn't have is not "set up."

## Setting up — pick the profile that matches the machine

Desktop Commander reads its settings from:

- **Windows:** `%USERPROFILE%\.claude-server-commander\config.json`
- **macOS / Linux:** `~/.claude-server-commander/config.json`

Two ready-made, company-scoped profiles live next to this skill:

- **`config.owner-windows.json`** — the owner's real working machine. Windows
  PowerShell shell; file access scoped to the repo checkout and the
  `etsy_api\marketing\` asset folder referenced in `BUSINESS.md`; nothing
  wider.
- **`../config.json`** — the cloud dev sandbox (Ubuntu, `bash`). Already in
  the repo; use this when working from the web/sandbox rather than the
  owner's PC.

### Install a profile

Copy the matching profile to the config path above, then reload the plugin.
On the sandbox, `../apply-config.sh` does this (with a timestamped backup of
any existing config). On the owner's Windows PC, copy
`config.owner-windows.json` to
`%USERPROFILE%\.claude-server-commander\config.json`.

### Or set values through Claude (any machine)

Ask Claude to apply them one key at a time against the Desktop Commander tools,
using the values from the chosen profile, e.g.:

```
set_config_value({ "key": "defaultShell",      "value": "powershell" })
set_config_value({ "key": "allowedDirectories", "value": ["C:\\Users\\<you>\\baby-book", "C:\\Users\\<you>\\etsy_api"] })
set_config_value({ "key": "fileWriteLineLimit", "value": 200 })
set_config_value({ "key": "telemetryEnabled",   "value": false })
```

Verify with `get_config({})`.

## The settings, tuned for this business

| Key | Why this value, for Our Little Miracle |
| --- | --- |
| `defaultShell` | The machine's real login shell — `powershell` on the owner's PC, `/bin/bash` on the sandbox. |
| `allowedDirectories` | Scoped to **only** the business's folders: the repo checkout (product source + all kits) and the local `etsy_api`/marketing asset folder. This keeps `assets/`, `dist/`, and the listing/marketing images reachable for builds and renders, while leaving the rest of a personal machine untouched. Never leave this `[]` — that exposes the whole filesystem, and on a solo owner's personal laptop that includes everything unrelated to the business. |
| `blockedCommands` | Denylists destructive **executables** (`mkfs*`, `dd`, `fdisk`, `parted`, `wipefs`, `shred`, `mount`, `shutdown`, `reboot`, `userdel`, …). The whole business — product source and the irreplaceable brand assets — lives on this one machine with no backup beyond Git, so blocking disk-wipe/format/power executables is cheap insurance. |
| `fileReadLineLimit` | `1000` (default) — fine for the HTML/JS/CSS/Python source here. |
| `fileWriteLineLimit` | `200` — raised from the default `50` so routine edits to `app.js`, `style.css`, and the listing copy aren't chopped into many small writes. |
| `telemetryEnabled` | `false` — a solo business on a personal machine; keep it private. |

### How `blockedCommands` matching actually works (important)

Desktop Commander matches only the **base executable name** (path stripped,
lowercased, exact match) — not the full command line. So:

- `dd`, `mkfs`, `shutdown`, `mount`, `userdel` → **blocked** (base name matches).
- `rm -rf /`, `chmod -R 777 /`, `systemctl poweroff` → **not** blocked; they
  extract to `rm` / `chmod` / `systemctl`, which are left off the list on
  purpose because blocking the bare executable would break everyday work
  (and the argument-scoped dangerous form can't be expressed here).

Treat command blocking as light defense-in-depth, **not** a security boundary
— it can be bypassed with absolute paths or command substitution
([known](https://github.com/wonderwhy-er/DesktopCommanderMCP/issues/217)
[issues](https://github.com/wonderwhy-er/DesktopCommanderMCP/issues/218)). The
real protection for this business is: keep `allowedDirectories` narrow, and
keep the repo pushed to GitHub so the product source is recoverable. For hard
isolation, Desktop Commander's Docker install is the right tool.

## Verifying the setup before a work session

Before telling the user the setup is ready, confirm all four:

1. `get_config({})` returns the expected `defaultShell` and the
   business-scoped `allowedDirectories`.
2. `python3 -c "import PIL; print(PIL.__version__)"` succeeds (build pipeline).
3. `node --version` and `git --version` succeed (render + version control).
4. A dry read of `dist/OurLittleMiracle.html`'s directory works — i.e. the
   repo checkout is inside `allowedDirectories`.

If all four pass, the AI tools are set up for Our Little Miracle. If not, fix
the gap (install the tool or widen `allowedDirectories` to the missing
business folder) before reporting done.
