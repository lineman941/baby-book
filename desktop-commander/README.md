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
| Project area    | `/workspace` (e.g. `/workspace/baby-book`)        |
| Toolchain found | git, python3, node 22, npm, go, rust/cargo, docker, gcc, make, jq, curl |

## The settings, and why each is what it is

| Key                 | Value                          | Reasoning |
| ------------------- | ------------------------------ | --------- |
| `defaultShell`      | `/bin/bash`                    | The detected login shell. This box has no zsh, so bash is correct (not the macOS default `/bin/zsh`). |
| `allowedDirectories`| `/root`, `/workspace`, `/tmp`  | Scopes **file** operations to the real working areas: the home dir, the folder holding projects like `baby-book`, and scratch space. Leaves `allowedDirectories` narrow so file access can't roam the whole filesystem. |
| `blockedCommands`   | destructive footguns           | Executable names only: `rm`, `mkfs`, `dd`, `fdisk`, `parted`, `sgdisk`, `wipefs`, `shred`, `blkdiscard`, `mount`, `umount`, `shutdown`, `reboot`, `poweroff`, `halt`, `init`, `systemctl`, `chown`, `chmod`, `passwd`, `userdel`, `deluser`, `iptables`, `ufw`, `sudo`. Desktop Commander validates these against the base command name extracted from user input, so argument-specific strings (like `"rm -rf /"`) are not checked—only the executable name matters. |
| `fileReadLineLimit` | `1000`                         | Desktop Commander default; fine for reading source files here. |
| `fileWriteLineLimit`| `200`                          | Raised from the default `50` so routine code edits on this dev box aren't split into many small writes. |
| `telemetryEnabled`  | `false`                        | Privacy-respecting default for a personal machine. |

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
set_config_value({ "key": "allowedDirectories",  "value": ["/root", "/workspace", "/tmp"] })
set_config_value({ "key": "fileWriteLineLimit",  "value": 200 })
set_config_value({ "key": "telemetryEnabled",    "value": false })
```

Verify with `get_config({})`.

## Adjusting for a different machine

These values match the environment this was generated in. On your own laptop/desktop,
update:

- **macOS** → `defaultShell` `/bin/zsh`, and `allowedDirectories` like
  `["/Users/<you>", "/tmp"]` (or scope tighter, e.g. `["/Users/<you>/Projects"]`).
- **Windows** → `defaultShell` `powershell`, and `allowedDirectories` like
  `["C:\\Users\\<you>", "C:\\Users\\<you>\\Projects"]`.
- **Tighter scope** → point `allowedDirectories` at a single code folder instead of the
  whole workspace directory.

## A note on security

`allowedDirectories` limits **file operations only**, not terminal commands. Desktop
Commander's command validation checks the extracted executable name against
`blockedCommands`, so determined command substitution / symlinks can still bypass a
denylist. Keep the scope no broader than you need. Desktop Commander's own docs
recommend the Docker install when you want hard isolation.
