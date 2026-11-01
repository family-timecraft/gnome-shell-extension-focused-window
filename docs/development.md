# Development — Focused Window D-Bus extension

There is no build step: the extension is raw GJS ESM, installed as files.
User-facing install and removal instructions live in the
[README](../README.md).

## Working from a checkout

```bash
# Install the working tree as the user extension
mkdir -p ~/.local/share/gnome-shell/extensions/focused-window-dbus@local
cp extension.js metadata.json ~/.local/share/gnome-shell/extensions/focused-window-dbus@local/
gnome-extensions enable focused-window-dbus@local
```

On Wayland, log out and back in to reload the shell (`Alt+F2`, `r` only works
on X11).

## Verifying changes

```bash
gnome-extensions info focused-window-dbus@local

gdbus call --session --dest org.gnome.Shell.Extensions.FocusedWindow \
  --object-path /org/gnome/Shell/Extensions/FocusedWindow \
  --method org.gnome.Shell.Extensions.FocusedWindow.Get

gdbus monitor --session --dest org.gnome.Shell.Extensions.FocusedWindow
```

Shell logs: `journalctl -f -o cat /usr/bin/gnome-shell`.

## Manual test checklist

There is no automated test suite; verify on a GNOME 45+ Wayland session:

- [ ] `Get` returns the focused window as JSON and matches the visible title.
- [ ] `GetVisibleWindows` lists one entry per trackable window across
      monitors and skips taskbar-hidden windows.
- [ ] `GetAllWindows` (startup snapshot) additionally includes minimized and
      other-workspace windows.
- [ ] `FocusChanged` fires on focus switches and title changes (watch with
      `gdbus monitor`).
- [ ] Disabling the extension removes the bus name cleanly.

## Maintainer agreements

- The D-Bus surface must not drift from the canonical contract XML in
  `timecraft-ts-shared` (see the
  [contract reference](https://github.com/family-timecraft/timecraft-ts-shared/blob/main/docs/dbus-reference.md)).
- GJS ESM style: keep `extension.js` dependency-free (Gio/GObject imports
  only) and defensive — a failing query logs and returns empty rather than
  breaking the shell.
- Note in the README/`docs/` when behavior observable through D-Bus changes.
