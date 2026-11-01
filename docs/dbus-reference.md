# D-Bus Contract Reference — FocusedWindow

Rendered from [`../dbus/org.gnome.Shell.Extensions.FocusedWindow.xml`](../dbus/org.gnome.Shell.Extensions.FocusedWindow.xml),
the canonical D-Bus IPC contract owned by this repository. Regenerate this
reference whenever the XML changes.

| | |
| :--- | :--- |
| **Bus** | Session bus |
| **Bus name** | `org.gnome.Shell.Extensions.FocusedWindow` |
| **Object path** | `/org/gnome/Shell/Extensions/FocusedWindow` |
| **Interface** | `org.gnome.Shell.Extensions.FocusedWindow` |
| **Exporter** | This extension (`focused-window-dbus@local`) |
| **Consumer** | The `timecraft-wayland-tracker` session daemon |

## Methods

| Method | Signature | Description |
| :--- | :--- | :--- |
| `Get` | `() → (window_info: s)` | JSON document describing the currently focused window |
| `GetVisibleWindows` | `() → (windows_list: s)` | JSON array of trackable windows on all monitors (skips taskbar-hidden windows) |

## Signals

| Signal | Signature | Description |
| :--- | :--- | :--- |
| `FocusChanged` | `(new_window_info: s)` | Emitted when the focused window or its title changes; payload is a `Get`-shaped JSON document |

All `s` (string) arguments carry JSON documents. The window-entry shape is
defined by [`architecture.md`](./architecture.md).

## Contract rules

- The XML file is the single source of truth; the implementation in
  `extension.js` must not drift from it. Note: the extension currently
  exposes one additional method, `GetAllWindows` (startup snapshot of
  minimized/hidden windows), which is not yet declared in the contract XML;
  a contract update is pending.

## Verifying live

```bash
# Watch interface traffic on the session bus
gdbus monitor --session --dest org.gnome.Shell.Extensions.FocusedWindow

# Call a method
gdbus call --session --dest org.gnome.Shell.Extensions.FocusedWindow \
  --object-path /org/gnome/Shell/Extensions/FocusedWindow \
  --method org.gnome.Shell.Extensions.FocusedWindow.Get
```
