#!/usr/bin/env bash
# Builds the Uno R3 firmware (remote I/O server + bytecode VM) with arduino-cli and installs the
# application hex (bootloader excluded) in public/firmwares/arduino/.
# Requires `arduino-cli` with the `arduino:avr` core.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

sketch="$work/uno-r3"
mkdir -p "$sketch"
cp "$root/firmwares/arduino/uno-r3/"* "$sketch/"
cp "$root/firmwares/vm/stdm_vm.c" "$root/firmwares/vm/stdm_vm.h" "$sketch/"

arduino-cli compile --fqbn arduino:avr:uno --output-dir "$work/out" "$sketch"
cp "$work/out/uno-r3.ino.hex" "$root/public/firmwares/arduino/uno-r3.hex"
echo "Installed public/firmwares/arduino/uno-r3.hex"
