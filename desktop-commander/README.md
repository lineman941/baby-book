# Desktop Commander — tailored config (Windows)

A [Desktop Commander](https://desktopcommander.app/) configuration customized for the
user's **Windows laptop** (an MSI machine).

Desktop Commander is the MCP server behind the `desktop-commander` plugin. It gives
Claude terminal control and filesystem access on the machine it runs on. Its behavior
is driven by a small `config.json`, and the useful values are machine-specific — the
shell, which directories file operations are allowed to touch, and which commands to
block all depend on the OS and layout of the actual machine. That's what's tuned here.

> An earlier revision of this folder was tailored to the Linux cloud sandbox this was
> generated in (shell `/bin/bash`, `/home/...` paths). This revision targets the user's
> real computer — a Windows laptop — which is what the customization is actually for.

## Target machine

| Property   | Value                                                     |
| ---------- | --------------------------------------------------------- |
| OS         | Windows (MSI laptop)                                       |
| Home       | `C:\Users\<you>` (referenced portably as `~`)             |
| Shell      | Windows PowerShell (`powershell.exe`)                     |

## The settings, and why each is what it is

| Key                 | Value              | Reasoning |
| ------------------- | ------------------ | --------- |
| `defaultShell`      | `powershell.exe`   | The shell always present on Windows. If you use PowerShell 7, switch to `pwsh.exe`; for the classic prompt, `cmd.exe`. |
| `allowedDirectories`| `["~"]`            | Desktop Commander expands `~` to your user profile (`C:\Users\<you>`), so **no username is hardcoded** and the file works on any Windows account. This scopes **file** operations to your profile. **Must be non-empty** — an empty list (`[]`) *grants the entire filesystem*. Terminal commands are **not** limited by this — only file read/write/edit. |
| `blockedCommands`   | `format`, `diskpart`, `bcdedit`, `vssadmin`, `wbadmin`, `fsutil`, `shutdown` | Windows executables that are destructive *and* rarely needed interactively: drive format, partitioning, boot config, shadow-copy/backup deletion, filesystem control, and power-off. See the matching note below. |
| `fileReadLineLimit` | `1000`             | Desktop Commander default; fine for reading source files. |
| `fileWriteLineLimit`| `200`              | Raised from the default `50` so routine edits aren't split into many small writes. |
| `telemetryEnabled`  | `false`            | Privacy-respecting default for a personal machine. |

### How `blockedCommands` matching works (important)

Desktop Commander does **not** match the full command string. For each command it runs
`extractBaseCommand` — strips the path and lowercases — and checks that **base executable
name** against `blockedCommands` by exact match. So a list entry only fires if it's a bare
executable name: `format`, `diskpart`, `shutdown` **work**; `format /fs:ntfs C:` still
matches (it extracts to `format`).

Two consequences on Windows specifically:

1. **PowerShell cmdlets can't be blocked.** Destructive PowerShell operations like
   `Remove-Item -Recurse -Force`, `Format-Volume`, or `Clear-Disk` run *inside*
   `powershell.exe`, so the base command is `powershell.exe`, not the cmdlet. This list
   cannot catch them.
2. **Blocking is all-or-nothing per executable.** There's no way to block only a dangerous
   *form* of a command, so the list deliberately omits everyday tools (`del`, `rd`,
   `reg`, `net`, `sc`, `icacls`, `takeown`) that blocking outright would break.

Treat command blocking as light defense-in-depth, **not** a security boundary — it can also
be bypassed via command substitution or absolute paths
([known](https://github.com/wonderwhy-er/DesktopCommanderMCP/issues/217)
[issues](https://github.com/wonderwhy-er/DesktopCommanderMCP/issues/218)). Use the Docker
install when you need real isolation.

## Applying it

Desktop Commander reads `%USERPROFILE%\.claude-server-commander\config.json` on Windows.

**Option A — script (on your Windows laptop):**

```powershell
.\apply-config.ps1
```

If script execution is blocked, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\apply-config.ps1
```

It backs up any existing config, then installs `config.json`. Restart Desktop Commander /
reload the plugin afterward.

**Option B — through Claude, one key at a time.**
Ask Claude to run these against the Desktop Commander tools:

```
set_config_value({ "key": "defaultShell",       "value": "powershell.exe" })
set_config_value({ "key": "allowedDirectories",  "value": ["~"] })
set_config_value({ "key": "fileWriteLineLimit",  "value": 200 })
set_config_value({ "key": "telemetryEnabled",    "value": false })
```

Verify with `get_config({})`.

## Adjusting

- **Tighter file scope** → replace `["~"]` with specific folders, e.g.
  `["~/Documents", "~/Desktop"]` or a single projects folder like `["~/projects"]`.
  Forward slashes are fine — Desktop Commander normalizes them to Windows separators.
  (Only a leading `~` or `~/` is expanded; a `~\…` backslash form is **not**, so write
  `~/Documents`, not `~\Documents`.)
- **Different shell** → `pwsh.exe` (PowerShell 7) or `cmd.exe`.
- **macOS / Linux instead** → `defaultShell` `/bin/zsh` (macOS) or `/bin/bash` (Linux),
  and keep `allowedDirectories` as `["~"]` (it expands to `/Users/<you>` or `/home/<you>`);
  swap the Windows `blockedCommands` for Unix ones (`mkfs`, `dd`, `fdisk`, `parted`,
  `wipefs`, `shred`, `mount`, `shutdown`, `reboot`, `userdel`).

## A note on security

`allowedDirectories` limits **file operations only**, not terminal commands, and a
determined command substitution / symlink can bypass a denylist. Keep the scope no broader
than you need. Desktop Commander's own docs recommend the Docker install when you want hard
isolation.
