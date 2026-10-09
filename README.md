# gnome-shell-extension-focused-window

GNOME Shell 45+ extension exposing focused/visible windows per monitor over
session D-Bus. Usage Capture sensor feeding `timecraft-wayland-tracker`.

## D-Bus interface

- Service: `org.gnome.Shell.Extensions.FocusedWindow`
- Path: `/org/gnome/Shell/Extensions/FocusedWindow`
- `Get()` → `(s)` JSON object of the currently focused window
- `GetVisibleWindows()` → `(s)` JSON array of trackable windows on every monitor
- Signal `FocusChanged` → `(s)` JSON payload, emitted on `notify::focus-window`
  and on focused-window `notify::title`

`GetVisibleWindows` iterates window actors, skips `is_skip_taskbar` entries,
marks focus by PID match. Each entry carries `app_id`, `title`, `pid`,
`monitor_index`, `monitor_connector`, `geometry`, workspace and state flags.

Contract authority: `timecraft-ts-shared`
`dbus/org.gnome.Shell.Extensions.FocusedWindow.xml` — this repo must not drift
from that XML.

## Files

- `extension.js` — the only implementation (GJS ESM, Shell 45+ `enable()` /
  `disable()`)
- `metadata.json` — EGO manifest (`uuid: focused-window-dbus@local`,
  Shell 45–48 required, 49–50 forward-compatible)

## Consumers

- `timecraft-wayland-tracker` — polls `Get()` every cycle, calls
  `GetVisibleWindows()` for unlock recovery and startup snapshot
- Desktop GUI — optional live active-window read

## Install

Prerequisites: GNOME Shell 45+, Wayland session, `gnome-extensions` CLI.

### User install (recommended, no root)

```bash
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/focused-window-dbus@local"
mkdir -p "$EXT_DIR"
cp extension.js metadata.json "$EXT_DIR/"
gnome-extensions enable focused-window-dbus@local
```

Then log out and back in (Wayland has no Shell restart; `Alt+F2 r` works
on X11 only).

### System-wide install (root, all users)

```bash
sudo mkdir -p /usr/share/gnome-shell/extensions/focused-window-dbus@local
sudo cp extension.js metadata.json \
  /usr/share/gnome-shell/extensions/focused-window-dbus@local/
sudo chmod 644 \
  /usr/share/gnome-shell/extensions/focused-window-dbus@local/{extension.js,metadata.json}
gnome-extensions enable focused-window-dbus@local
```

Log out and back in.

### Verify

```bash
gnome-extensions info focused-window-dbus@local
gdbus call --session --dest org.gnome.Shell.Extensions.FocusedWindow \
  --object-path /org/gnome/Shell/Extensions/FocusedWindow \
  --method org.gnome.Shell.Extensions.FocusedWindow.Get
```

## Remove

Disable keeps files, remove deletes them.

```bash
# Disable only
gnome-extensions disable focused-window-dbus@local

# User install remove
gnome-extensions disable focused-window-dbus@local
rm -rf "$HOME/.local/share/gnome-shell/extensions/focused-window-dbus@local"

# System-wide remove
gnome-extensions disable focused-window-dbus@local
sudo rm -rf /usr/share/gnome-shell/extensions/focused-window-dbus@local
```

Log out and back in for removal to take effect.

## Management

```bash
gnome-extensions enable focused-window-dbus@local
gnome-extensions disable focused-window-dbus@local
gdbus call --session --dest org.gnome.Shell.Extensions.FocusedWindow \
  --object-path /org/gnome/Shell/Extensions/FocusedWindow \
  --method org.gnome.Shell.Extensions.FocusedWindow.GetVisibleWindows
gdbus monitor --session --dest org.gnome.Shell.Extensions.FocusedWindow
```

Logs: `journalctl -f -o cat /usr/bin/gnome-shell`.

## License

GPL-2.0-or-later, see `LICENSE`. SPDX identifier in `extension.js`.
