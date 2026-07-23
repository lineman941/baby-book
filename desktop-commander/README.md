# Desktop Commander — tailored config

A [Desktop Commander](https://desktopcommander.app/) configuration customized to
**this computer**, detected on 2026-07-21.

Desktop Commander is the MCP server behind the `desktop-commander` plugin. It gives
Claude terminal control and filesystem access on the machine it runs on. Its behavior
is driven by a small `config.json`, and the useful values are machine-specific — the
shell path, which directories file operations are allowed to touch, and which commands
to block all depend on the OS and layout of the actual machine. That's what's tuned here.

## What was detected on this machine

| Property        | Value                                             |
| --------------- | ------------------------------------------------- |
| OS              | Ubuntu 24.04.4 LTS (Linux, x86_64, kernel 6.18.5) |
| User / home     | `root` → `/root`                                  |
| Login shell     | `/bin/bash` (only bash/sh/dash present — no zsh)  |
| Project area    | `/home/user` (e.g. `/home/user/baby-book`)        |
| Toolchain found | git, python3, node 22, npm, go, rust/cargo, docker, gcc, make, jq, curl |

## The settings, and why each is what it is

| Key                 | Value                          | Reasoning |
| ------------------- | ------------------------------ | --------- |
| `defaultShell`      | `/bin/bash`                    | The detected login shell. This box has no zsh, so bash is correct (not the macOS default `/bin/zsh`). |
| `allowedDirectories`| `/root`, `/home/user`, `/tmp`  | Scopes **file** operations to the real working areas: the home dir, the folder holding projects like `baby-book`, and scratch space. Leaving this `[]` would grant the whole filesystem. Note: this restricts file read/write/edit only — terminal commands are **not** limited by it. |
| `blockedCommands`   | destructive **executables**    | Denylists disk-wipe / format / mount / power-off executables (`mkfs*`, `dd`, `fdisk`, `parted`, `wipefs`, `shred`, `mount`, `shutdown`, `reboot`, `userdel`, …). See the matching note below. |
| `fileReadLineLimit` | `1000`                         | Desktop Commander default; fine for reading source files here. |
| `fileWriteLineLimit`| `200`                          | Raised from the default `50` so routine code edits on this dev box aren't split into many small writes. |
| `telemetryEnabled`  | `false`                        | Privacy-respecting default for a personal machine. |

### How `blockedCommands` matching works (important)

Desktop Commander does **not** match the full command string. For each command it
runs `extractBaseCommand` — strips the path and lowercases — and checks that **base
executable name** against `blockedCommands` by exact match. So a list entry only fires
if it's a bare executable name:

- `dd`, `mkfs`, `shutdown`, `mount`, `userdel` → **work** (base name matches).
- `rm -rf /`, `chmod -R 777 /`, `systemctl poweroff`, `:(){ :|:& };:` → **do nothing**;
  they extract to `rm` / `chmod` / `systemctl` / `:`, which aren't listed.

That means blocking is **all-or-nothing per executable** — there's no way to block only a
dangerous *form* of a command. This blocklist therefore includes only executables that
are destructive *and* rarely needed in normal work. It deliberately does **not** list
`rm`, `chmod`, `chown`, `sudo`, or `systemctl`: blocking the bare executable would break
everyday use, and the argument-scoped forms can't be expressed here. Treat command
blocking as light defense-in-depth, not a security boundary — it can also be bypassed via
command substitution or absolute paths ([known](https://github.com/wonderwhy-er/DesktopCommanderMCP/issues/217)
[issues](https://github.com/wonderwhy-er/DesktopCommanderMCP/issues/218)). Use the Docker
install when you need real isolation.

## Applying it

Desktop Commander reads `~/.claude-server-commander/config.json`
(`%USERPROFILE%\.claude-server-commander\config.json` on Windows).

**Option A — script (this machine):**

```bash
./apply-config.sh
```

It backs up any existing config, then installs `config.json`. Restart Desktop
Commander / reload the plugin afterward.

**Option B — through Claude (any machine), one key at a time.**
Ask Claude to run these against the Desktop Commander tools:

```
set_config_value({ "key": "defaultShell",       "value": "/bin/bash" })
set_config_value({ "key": "allowedDirectories",  "value": ["/root", "/home/user", "/tmp"] })
set_config_value({ "key": "fileWriteLineLimit",  "value": 200 })
set_config_value({ "key": "telemetryEnabled",    "value": false })
```

Verify with `get_config({})`.

## Adjusting for a different machine

These values match the cloud sandbox this was generated in. On your own laptop/desktop,
update:

- **macOS** → `defaultShell` `/bin/zsh`, and `allowedDirectories` like
  `["/Users/<you>", "/tmp"]` (or scope tighter, e.g. `["/Users/<you>/Projects"]`).
- **Windows** → `defaultShell` `powershell`, and `allowedDirectories` like
  `["C:\\Users\\<you>", "C:\\Users\\<you>\\Projects"]`.
- **Tighter scope** → point `allowedDirectories` at a single code folder instead of the
  whole home directory.

## A note on security

`allowedDirectories` limits **file operations only**, not terminal commands, and
determined command substitution / symlinks can bypass a denylist. Keep the scope no
broader than you need. Desktop Commander's own docs recommend the Docker install when
you want hard isolation.
