# Bytecode

A compact program format for embedded targets, and the tools around it. A compiled project (the
`PLCRoutine[]` the simulator runs) is translated into a **bytecode image**, which a small virtual
machine (VM) interprets on the board. The first target is the Arduino Uno R3 (ATmega328P, 2 KB of
RAM, 1 KB of EEPROM).

```
CompiledProject ──generateBytecode──▶ image (bytes) ──verifyBytecode──▶ checkAdmissibility ──▶ board
                                         │                                                      │
                                         └── same program, same semantics ─────────────  VM (C, firmwares/vm/)
```

The format and VM semantics are specified in **[BYTECODE-SPEC.md](../../BYTECODE-SPEC.md)** at the
project root. Section numbers (`§3.1`, `§7.1`, …) are stable and referenced from the code and
the firmware.

## Files

| File | Role |
|---|---|
| `bytecode-format.ts` | Constants of the format: header offsets, opcodes, type codes, I/O roles, limits |
| `bytecode.generator.ts` | `generateBytecode`: compiled project to image, plus its layout (sizes, indices) |
| `bytecode.verifier.ts` | `verifyBytecode`: structural check of an image, same rules as the VM's loader |
| `bytecode.admissibility.ts` | `checkAdmissibility`: does the image fit the target's limits? |
| `variable-memory.ts` | `decodeVariableMemory`: values by name from a copy of the VM variable memory |
| `arduino-io-bindings.ts` | Adapter from the Arduino pin plan (`RemoteIoPlan`) to neutral `IoBinding`s |
| `bytecode.error.ts` | `BytecodeGenerationError`: the project holds something the format cannot express |
| `crc.ts` | CRC-16/CCITT-FALSE (image integrity) and CRC-32 (image identifier) |

The VM itself is C, in `firmwares/vm/` (`stdm_vm.c`, `stdm_vm.h`), with no Arduino dependency: I/O,
clock and image storage sit behind a small platform interface (`stdm_platform`). The Uno R3
platform is `firmwares/arduino/uno-r3/`.
