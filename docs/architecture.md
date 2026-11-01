# Architecture — Focused Window D-Bus extension

A GNOME Shell extension (45+) that reports focused and visible window
metadata to the session bus. Within TimeCraft it is the *Usage Capture*
sensor: the `timecraft-wayland-tracker` daemon consumes its output and
persists window sessions. The extension itself stores nothing.

## D-Bus surface

The extension exports one interface on the session bus. The canonical
contract is [`dbus/org.gnome.Shell.Extensions.FocusedWindow.xml`](../dbus/org.gnome.Shell.Extensions.FocusedWindow.xml);
the rendered reference is [D-Bus contract reference](./dbus-reference.md).

| | |
| :--- | :--- |
| **Bus name** | `org.gnome.Shell.Extensions.FocusedWindow` |
| **Object path** | `/org/gnome/Shell/Extensions/FocusedWindow` |
| **Interface** | `org.gnome.Shell.Extensions.FocusedWindow` |

Methods `Get`, `GetVisibleWindows`, and the `FocusChanged` signal are declared
by the contract. The extension additionally implements `GetAllWindows`
(startup snapshot with the `is_skip_taskbar` filter lifted) which is not yet
declared in the contract XML; a contract update is pending.

## Window entry shape

All string arguments carry JSON documents. Each window entry holds:
`app_id`, `title`, `pid`, `window_id`, `monitor_index`, `monitor_connector`,
`geometry`, and workspace/state flags. `GetVisibleWindows` filters out
taskbar-hidden windows; `GetAllWindows` returns minimized, hidden, and
other-workspace windows too.

## Emission rules

- `FocusChanged` is emitted when the focused window or its title changes.
- Multi-monitor: entries carry `monitor_index` / `monitor_connector` so the
  tracker can maintain one session per monitor.

## Lifecycle

`enable()` registers the D-Bus service via `Gio.DBusExportedObject.wrapJSObject`;
`disable()` unregisters it. There is no preferences UI and no persistent
state. The implementation is a single GJS ESM module (`extension.js`).
