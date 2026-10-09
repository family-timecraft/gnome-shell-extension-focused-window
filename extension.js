// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from "gi://Gio";
import GLib from "gi://GLib";

// Raw XML interface definition (required by wrapJSObject)
// Canonical contract: org.gnome.Shell.Extensions.FocusedWindow
// Methods: Get, GetVisibleWindows. Signal: FocusChanged.
// Must stay in sync with timecraft-ts-shared
// dbus/org.gnome.Shell.Extensions.FocusedWindow.xml (no drift).
const DBUS_INTERFACE_XML = `
<node>
  <interface name="org.gnome.Shell.Extensions.FocusedWindow">
    <method name="Get">
      <arg type="s" name="json_data" direction="out"/>
    </method>
        <method name="GetVisibleWindows">
            <arg type="s" name="json_data" direction="out"/>
        </method>
        <signal name="FocusChanged">
            <arg type="s" name="json_data"/>
        </signal>
  </interface>
</node>
`;

class FocusedWindowDBus {
    Get() {
        try {
            const data = this._getFocusedWindowData();
            const jsonStr = JSON.stringify(data);
            // Explicitly return GLib.Variant tuple matching signature "(s)"
            return new GLib.Variant("(s)", [jsonStr]);
        } catch (e) {
            logError(e, "FocusedWindowDBus Get");
            throw new GLib.Error(Gio.dbus_error_quark(), Gio.DBusError.FAILED, e.message);
        }
    }

    GetVisibleWindows() {
        try {
            const data = this._getVisibleWindowData();
            const jsonStr = JSON.stringify(data);
            return new GLib.Variant("(s)", [jsonStr]);
        } catch (e) {
            logError(e, "FocusedWindowDBus GetVisibleWindows");
            throw new GLib.Error(Gio.dbus_error_quark(), Gio.DBusError.FAILED, e.message);
        }
    }

    _buildWindowData(window, isFocused) {
        if (!window) {
            return null;
        }

        // Gather application identifier with fallbacks
        let app_id = "";
        try {
            if (typeof window.get_gtk_app_id === "function") app_id = window.get_gtk_app_id() || "";
        } catch (e) {}
        if (!app_id)
            try {
                if (typeof window.get_wm_class === "function") app_id = window.get_wm_class() || "";
            } catch (e) {}
        if (!app_id)
            try {
                if (typeof window.get_wm_class_instance === "function") app_id = window.get_wm_class_instance() || "";
            } catch (e) {}
        if (!app_id)
            try {
                if (typeof window.get_sandboxed_app_id === "function") app_id = window.get_sandboxed_app_id() || "";
            } catch (e) {}

        const title = typeof window.get_title === "function" ? window.get_title() || "" : "";
        const pid = typeof window.get_pid === "function" ? window.get_pid() : 0;
        const sandboxed_app_id =
            typeof window.get_sandboxed_app_id === "function" ? window.get_sandboxed_app_id() || null : null;
        const window_type = typeof window.get_window_type === "function" ? window.get_window_type() : -1;
        const workspace = window.get_workspace ? window.get_workspace() : null;
        const workspace_index = workspace ? workspace.index() : -1;

        let rect = { x: 0, y: 0, width: 0, height: 0 };
        if (typeof window.get_frame_rect === "function") {
            rect = window.get_frame_rect();
        }

        let monitor_index = -1;
        let monitor_connector = null;
        try {
            if (typeof window.get_monitor === "function") {
                monitor_index = window.get_monitor();
            }
            if (monitor_index >= 0 && typeof global.display.get_monitor_connector === "function") {
                monitor_connector = global.display.get_monitor_connector(monitor_index) || null;
            }
        } catch (e) {}

        return {
            focused: isFocused,
            app_id,
            title,
            pid,
            sandboxed_app_id,
            window_type,
            workspace: workspace_index,
            monitor_index,
            monitor_connector,
            geometry: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
            },
            is_skip_taskbar: typeof window.is_skip_taskbar === "function" ? window.is_skip_taskbar() : false,
            is_fullscreen: typeof window.is_fullscreen === "function" ? window.is_fullscreen() : false,
            is_maximized: typeof window.is_maximized === "function" ? window.is_maximized() : false,
        };
    }

    _getFocusedWindowData() {
        const window = global.display.focus_window;
        if (!window) {
            return { focused: false };
        }

        return this._buildWindowData(window, true);
    }

    _getVisibleWindowData() {
        const focusedWindow = global.display.focus_window;
        const focusedPid = focusedWindow && typeof focusedWindow.get_pid === "function" ? focusedWindow.get_pid() : null;
        const visibleWindows = [];
        const actors = typeof global.get_window_actors === "function" ? global.get_window_actors() : [];

        for (const actor of actors) {
            const window = actor && actor.meta_window ? actor.meta_window : null;
            if (!window) {
                continue;
            }

            const data = this._buildWindowData(window, false);
            if (!data || !data.app_id || data.is_skip_taskbar) {
                continue;
            }

            if (focusedPid && data.pid && data.pid === focusedPid) {
                data.focused = true;
            }

            visibleWindows.push(data);
        }

        return visibleWindows;
    }
}

export default class Extension {
    enable() {
        try {
            this._serviceInstance = new FocusedWindowDBus();
            this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(DBUS_INTERFACE_XML, this._serviceInstance);
            this._dbusImpl.export(Gio.DBus.session, "/org/gnome/Shell/Extensions/FocusedWindow");

            this._nameId = Gio.bus_own_name(
                Gio.BusType.SESSION,
                "org.gnome.Shell.Extensions.FocusedWindow",
                Gio.BusNameOwnerFlags.NONE,
                null, // bus_acquired_closure
                null, // name_acquired_closure
                null, // name_lost_closure
            );

            this._focusChangedId = global.display.connect("notify::focus-window", () => {
                this._emitFocusChanged();
                this._reconnectTitleObserver();
            });
            this._titleChangedId = 0;
            this._observedWindow = null;
            this._reconnectTitleObserver();

            console.log("FocusedWindowDBus: enabled");
        } catch (e) {
            logError(e, "FocusedWindowDBus: failed to enable");
        }
    }

    _emitFocusChanged() {
        if (!this._dbusImpl || !this._serviceInstance) {
            return;
        }

        try {
            const payload = JSON.stringify(this._serviceInstance._getFocusedWindowData());
            this._dbusImpl.emit_signal("FocusChanged", new GLib.Variant("(s)", [payload]));
        } catch (e) {
            logError(e, "FocusedWindowDBus: FocusChanged signal emit failed");
        }
    }

    _disconnectTitleObserver() {
        if (this._observedWindow && this._titleChangedId) {
            this._observedWindow.disconnect(this._titleChangedId);
        }
        this._observedWindow = null;
        this._titleChangedId = 0;
    }

    _reconnectTitleObserver() {
        this._disconnectTitleObserver();

        const window = global.display.focus_window;
        if (!window) {
            return;
        }

        this._observedWindow = window;
        this._titleChangedId = window.connect("notify::title", () => {
            this._emitFocusChanged();
        });
    }

    disable() {
        this._disconnectTitleObserver();
        if (this._focusChangedId) {
            global.display.disconnect(this._focusChangedId);
            this._focusChangedId = 0;
        }
        if (this._dbusImpl) {
            this._dbusImpl.unexport();
            this._dbusImpl = null;
        }
        if (this._nameId) {
            Gio.bus_unown_name(this._nameId);
            this._nameId = 0;
        }
        this._serviceInstance = null;
        console.log("FocusedWindowDBus: disabled");
    }
}
