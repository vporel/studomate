# Bytecode

A compact program format for embedded targets, and the tools around it. A compiled project (the
`PLCRoutine[]` the simulator runs) is translated into a **bytecode image**, which a small virtual
machine (VM) interprets on the board. The first target is the Arduino Uno R3.

```
CompiledProject ──generateBytecode──▶ image (bytes) ──verifyBytecode──▶ checkAdmissibility ──▶ board
                                         │                                                      │
                                         └── same program, same semantics ─────────────  VM (C, firmwares/vm/)
```

The JS simulator (`src/simulator/`) is the **normative reference**: the VM reproduces its
observable behaviour, and the conformity tests compare the two cycle by cycle.

## Files

| File | Role |
|---|---|
| `bytecode-format.ts` | Constants of the format: header offsets, opcodes, type codes, I/O roles, limits |
| `bytecode.generator.ts` | `generateBytecode`: compiled project to image, plus its layout (sizes, indices) |
| `bytecode.verifier.ts` | `verifyBytecode`: structural check of an image, same rules as the VM's loader |
| `bytecode.admissibility.ts` | `checkAdmissibility`: does the image fit the target's limits? |
| `arduino-io-bindings.ts` | Adapter from the Arduino pin plan (`RemoteIoPlan`) to neutral `IoBinding`s |
| `bytecode.error.ts` | `BytecodeGenerationError`: the project holds something the format cannot express |
| `crc.ts` | CRC-16/CCITT-FALSE (image integrity) and CRC-32 (image identifier) |

The VM itself is C, in `firmwares/vm/`. Full specification: `_ai/support-arduino/spec-bytecode.md`.

## Model

- **Stack machine.** Cells are 32 bits. A cell is just a bit pattern: the instruction that
  consumes it decides how to read it (signed, unsigned, boolean).
- **Variables are addressed by index**, never by name. They are stored by storage class, in this
  order: booleans (1 byte), `INT` (2 bytes, signed), `WORD` (2 bytes), then 32-bit variables
  (`DINT`, `DWORD`, `TIME` and internal numeric variables). An address in RAM is computed from the
  index and the four counts of the header, with no table.
- **Only variables the code uses are kept**, plus those wired to a pin.
- **Jumps only go forward**, so a cycle always ends.
- **The program does not touch pins.** The VM copies the inputs into variables before the cycle and
  the outputs from variables after it, like a PLC.

### Type codes

Used by the operand of the arithmetic and conversion instructions.

| Code | Type | Result is wrapped to |
|---|---|---|
| 0 | `BOOL` | 0 or 1 |
| 1 | `INT` | 16 bits, signed |
| 2 | `WORD` | 16 bits, unsigned (`CONV` only) |
| 3 | `DINT` | 32 bits |
| 4 | `DWORD` | 32 bits (`CONV` only) |
| 5 | `TIME` | 32 bits (milliseconds) |
| 6 | internal numeric (no declared type) | 32 bits |

`REAL` and `STRING` cannot be embedded: the generator throws, and the project analyser reports
`HARDWARE_TYPE_NOT_SUPPORTED` beforehand.

## Image format

All multi-byte integers are little-endian.

```
Offset  Size  Field
0       4     magic "STDM"
4       1     format version (1)
5       1     reserved (0)
6       2     cycle period (ms)
8       1     boolean variables count
9       1     INT variables count
10      1     WORD variables count
11      1     32-bit variables count
12      1     I/O entries count
13      1     system variables count
14      1     routines count
15      1     scanned routines count
16      1     maximum stack depth (cells)
17      1     maximum call depth
18      2     code size
20      2     CRC-16 of the whole image (this field excluded)
22      4     image identifier (CRC-32 of the image, CRC-16 and identifier fields zeroed)
26      ...   I/O table          3 bytes per entry
...     ...   system variables   2 bytes per entry
...     ...   routines table     2 bytes per entry: start offset in the code
...     ...   code
```

- **I/O entry**: variable index, role (bits 0 to 2: 0 digital input, 1 digital input with pull-up,
  2 analog input, 3 digital output, 4 PWM output; bit 3: inverted), pin number.
- **System variable entry**: variable index, identifier (0 `_SYS_FIRST_SCAN`, 1 to 5 the time
  bases `_SYS_TB_100ms` to `_SYS_TB_2s`).
- **Routines**: the first `scanned` routines run every cycle, in order. The others are only reached
  by `CALL`. Each routine ends with a single `RET`.

The identifier tells two images apart: after a Studomate update that changes the generated code, a
board holding an older image reports a different identifier.

## Instruction set

`v`: variable index (1 byte). `t`: type code (1 byte). `a`: absolute code address (2 bytes). `r`:
routine index (1 byte). The stack effect reads `before → after`.

### Constants and variables

| Opcode | Mnemonic | Operands | Stack | Effect |
|---|---|---|---|---|
| `01` | `PUSH0` | | `→ 0` | Push 0 |
| `02` | `PUSH1` | | `→ 1` | Push 1 |
| `03` | `PUSH8` | imm8 | `→ n` | Push a signed 8-bit constant |
| `04` | `PUSH16` | imm16 | `→ n` | Push a signed 16-bit constant |
| `05` | `PUSH32` | imm32 | `→ n` | Push a 32-bit pattern |
| `06` | `LOAD` | `v` | `→ x` | Push a variable (sign-extended for `INT`, zero-extended for `WORD`) |
| `07` | `STORE` | `v` | `x →` | Pop and write, truncated to the variable's storage class |
| `08` | `POP` | | `x →` | Pop and discard |

The generator picks the shortest push whose value reproduces the constant's 32-bit pattern. A
`WORD` of 40000 is `PUSH32`, because `PUSH16` would sign-extend it.

### Arithmetic and conversion

| Opcode | Mnemonic | Operands | Stack | Effect |
|---|---|---|---|---|
| `10` | `ADD` | `t` | `a b → a+b` | Addition, wrapped to type `t` |
| `11` | `SUB` | `t` | `a b → a-b` | Subtraction |
| `12` | `MUL` | `t` | `a b → a*b` | Multiplication |
| `13` | `DIV` | `t` | `a b → a/b` | Integer division truncated toward zero. **Fault if `b` is 0.** `-2^31 / -1` gives `-2^31` |
| `14` | `NEG` | `t` | `a → -a` | Negation |
| `15` | `CONV` | `t` | `a → a'` | Wraps `a` to type `t` (the `*_TO_*` functions) |

`ADD`, `SUB`, `MUL`, `DIV` and `NEG` accept types 1, 3, 5 and 6 only: arithmetic on `WORD` and
`DWORD` is refused by the analysis. Computation is done on unsigned 32 bits, so there is no
undefined behaviour in C.

### Comparison and logic

| Opcode | Mnemonic | Operands | Stack | Effect |
|---|---|---|---|---|
| `20` | `CMP` | `c` | `a b → 0/1` | Compare. `c` bits 0 to 2: 0 `=`, 1 `!=`, 2 `<`, 3 `<=`, 4 `>`, 5 `>=`. Bit 3: unsigned (for `WORD` and `DWORD`) |
| `21` | `NOT` | | `a → !a` | 1 if `a` is 0, else 0 |

### Jumps

| Opcode | Mnemonic | Operands | Stack | Effect |
|---|---|---|---|---|
| `30` | `JMP` | `a` | | Jump |
| `31` | `JZ` | `a` | `x →` | Pop, jump if 0 |
| `32` | `JNZ` | `a` | `x →` | Pop, jump if not 0 |
| `33` | `JZK` | `a` | `x → x` or `x →` | If the top is 0: jump **keeping** it. Otherwise pop and continue (**AND**) |
| `34` | `JNZK` | `a` | `x → x` or `x →` | If the top is not 0: jump keeping it. Otherwise pop and continue (**OR**) |

`a AND b` is `a ; JZK end ; b ; end:`. `a OR b` is `a ; JNZK end ; b ; end:`. The right operand is
only evaluated when needed, as in the simulator: a division guarded by `j != 0 AND ...` does not
fault. An `IF` is `cond ; JZ else ; then ; JMP end ; else: ... ; end:`.

### Calls and blocks

| Opcode | Mnemonic | Operands | Stack | Effect |
|---|---|---|---|---|
| `40` | `CALL` | `r` | | Call routine `r` (stack must be empty) |
| `41` | `RET` | | | End of routine |
| `50` | `TIMER` | `k last elapsed out` | `in pt → q` | Timer block |
| `51` | `COUNTER` | `k last current out` (+ `downLast downOut` for `CTUD`) | see below | Counter block |

A conditional call (`user-program` block) is `cond ; JZ skip ; CALL r ; skip:`.

**`TIMER`**: `k` is 0 `TON`, 1 `TOF`, 2 `TP`. `last` is the edge memory, `elapsed` the elapsed
time, `out` the output (`Q`). Pops the preset `PT` (ms) then the input `IN`, pushes `Q`. Elapsed
time grows by the cycle duration while the timer runs.

**`COUNTER`**: `k` is 0 `CTU`, 1 `CTD`, 2 `CTUD`. Counts on rising edges of the input; the control
input (`R` or `LD`) is level-based and has priority. The outputs compare the value **after** it was
wrapped to its variable's type.

| Kind | Pops (top first) | Pushes |
|---|---|---|
| `CTU`, `CTD` | `PV`, control, input | `Q` |
| `CTUD` | `LD`, `CD`, `PV`, `R`, `CU` | `QU` (`QD` is written to `downOut`) |

`PT`, `PV` and the elapsed or current value are never `WORD` or `DWORD`.

## Verification

`verifyBytecode` checks an image before it is ever run, with the same rules as the VM's loader
(`stdm_vm_verify`): magic, version, size, CRC, tables, known opcodes, operands inside the routine,
valid indices and types, and, in one pass over the code, that every jump goes forward to the start
of an instruction of the same routine and that the stack depth is consistent on every path. This is
why the VM needs no stack check while running. At most 16 forward jumps may be pending at once:
deeper nesting of conditions is reported by `checkAdmissibility` as `JUMP_NESTING_EXCEEDED`.

## Admissibility

`checkAdmissibility(image, limits)` compares an image to the limits of a target descriptor
(`HardwareDeviceDescriptor["limits"]`) and returns the issues, with exact sizes: image too large
(and the heaviest routine), variable memory, stack depth, call depth, jump nesting.

## Adding a target

The format knows nothing about a particular board. A target provides:

1. a descriptor in `src/hardware/` with its limits (`programStorageBytes`, `vm` capacities);
2. an adapter producing `IoBinding[]` (variable, role, pin number, inverted), like
   `arduino-io-bindings.ts`;
3. a VM platform (read the image, clock, pins), like `firmwares/arduino/uno-r3/`.

## Tests

- `bytecode.generator.test.ts`, `bytecode.verifier.test.ts`, `bytecode.admissibility.test.ts`: unit tests.
- `vm.native.test.ts`: compiles the VM for the development machine (system `cc`, with the
  undefined-behaviour sanitizer) and runs images under a virtual clock.
- `vm.conformity.test.ts`: runs the project templates and typed programs in both the simulator and
  the native VM, and compares every variable on every cycle.
- `vm.templates-size.test.ts`: the reference templates fit the Uno R3.
- Test helpers: `tests/utils/bytecode-program.ts` (hand-built projects, disassembler),
  `native-vm.ts`, `vm-conformity.ts`.

Known differences from the simulator, left out of the conformity scenarios: products beyond 2^53,
`TIME` and internal variables wrapping at 32 bits, time catch-up after a late cycle. See section
11 of the specification.
