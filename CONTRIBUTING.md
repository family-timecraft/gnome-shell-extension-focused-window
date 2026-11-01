# Contributing to GNOME Shell Extension — Focused Window

Code contributions are not currently accepted; suggestions, bug reports, and
comments are welcome. Use the issue forms in this repository to file feedback.

Organization-wide policy (commit conventions, review hygiene, linking rules)
lives in the
[family-timecraft contributing guide](https://github.com/family-timecraft/.github/blob/main/CONTRIBUTING.md);
this file covers only this repository.

## Development environment

- GNOME Shell 45+ on Wayland (see `metadata.json` for the supported shell
  versions), plus `gdbus` for verification. There is no build step and no
  package dependencies.

## Workflows

Developer install, verification commands, and the manual test checklist live
in [docs/development.md](./docs/development.md). Architecture and the D-Bus
contract live in [docs/architecture.md](./docs/architecture.md).

## Maintainer working agreements

In addition to the organization agreements:

- The D-Bus surface must not drift from the canonical contract XML in
  [`dbus/`](./dbus/) (the
  [contract reference](./docs/dbus-reference.md)
  is the rendered form).
- Changes observable through D-Bus are reflected in `docs/architecture.md`
  and `docs/dbus-reference.md` in the same change.
- The extension must stay defensive: a failing window query logs and returns
  empty rather than breaking the shell.
