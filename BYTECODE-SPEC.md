# Bytecode — Format and VM Specification

Normative specification of the Studomate bytecode format and virtual machine semantics.
Section numbers are referenced from the code (`§3.1`, `§7.1`): keep them stable.

The TypeScript tooling lives in `src/bytecode/`; the VM C core in `firmwares/vm/`
(`stdm_vm.c`, `stdm_vm.h`); the Uno R3 platform in `firmwares/arduino/uno-r3/`.

```
CompiledProject ──generateBytecode──▶ image (bytes) ──verifyBytecode──▶ checkAdmissibility ──▶ board
                                         │                                                      │
                                         └── same program, same semantics ─────────────  VM (C, firmwares/vm/)
```

## 1. Principles

- **The JS simulator is the normative reference** (`src/simulator/`: the `PLC` cycle,
  `EvaluatorVisitor`, `TimerNodeEvaluator`, `CounterNodeEvaluator`, and the start of
  `SimulationManager.startSimulation` for the establishment cycle, §7.3). The VM reproduces its
  observable behaviour. The known differences are listed in §11 and are left out of the conformity
  scenarios.
- **The generator's input is the `CompiledProject`** (`variables`, `routines`, `routinesById`,
  after semantic analysis), never the schema. Routines are lists of expression trees: assignment,
  `if`, operations, conversions, `TIMER_BLOCK` and `COUNTER_BLOCK` blocks, routine calls. GRAFCET
  steps are variables `Xn` already translated into assignments: **no step opcode exists**.
- **Stack machine**, 32-bit cells, compact byte code, little-endian for every multi-byte integer.
- **No names in the bytecode**: variables and routines are designated by index.
- **The VM core is portable C** (also compiled natively to run the conformity tests). It must
  contain no undefined behaviour, in particular no signed integer overflow (§4.2).
- **Jumps only go forward**, so a cycle always ends.
- **The program does not touch pins.** The VM copies the inputs into variables before the cycle and
  the outputs from variables after it, like a PLC.

## 2. Types and representation

Supported on the Uno R3 (`supportedVariableTypes` of its descriptor): `BOOL`, `INT`, `WORD`,
`DINT`, `DWORD`, `TIME`. `REAL` and `STRING` are refused by the project analyser
(`HARDWARE_TYPE_NOT_SUPPORTED`); the generator throws if it meets one anyway.

Type code (1 byte), unique across the format (also used as the type tag of operations, §4):

| Code | Type | Storage class | Stack cell | Domain |
|---|---|---|---|---|
| 0 | `BOOL`, and *internal boolean* (step memory `Xn`, edge memory, block output) | 1 byte (0 or 1) | 0 or 1 | false, true |
| 1 | `INT` | 2 bytes, signed | int32, sign-extended | -32768 to 32767, wraps modulo |
| 2 | `WORD` | 2 bytes, unsigned | uint32 (0 to 65535) | 0 to 65535, wraps modulo (`CONV` only) |
| 3 | `DINT` | 4 bytes | int32 | wraps modulo 2^32 |
| 4 | `DWORD` | 4 bytes | uint32 | 0 to 2^32-1, wraps modulo (`CONV` only) |
| 5 | `TIME` | 4 bytes | int32 | milliseconds, wraps modulo 2^32 (see §11) |
| 6 | *internal numeric* (no declared type: elapsed time of a timer, current value of a counter; `ANY_NUM`) | 4 bytes | int32 | same as `TIME` |

**Stack convention**: a cell holds a 32-bit pattern. For a signed type (`INT`, `DINT`, `TIME`,
internal) the value is read as int32; for an unsigned type (`WORD`, `DWORD`) as uint32. Booleans
are always 0 or 1. An `INT` widened to `DINT` (or a `WORD` to `DWORD`, the only implicit widenings
of the language) needs no instruction: the cell already holds the right value.

**Writing to a variable** (`STORE`): the value is brought down to the storage class of the slot
(the high bits are truncated), then read back with sign extension (`INT`) or zero extension
(`WORD`). A 4-byte variable keeps the 32-bit pattern as is: `DINT`, `DWORD`, `TIME` and internal
variables only differ by how the operations that consume them read the cell. This is the
simulator's `coerceToRange`, applied to every write, including in the middle of a cycle.

## 3. Image format

All multi-byte integers are little-endian.

```
Offset  Size  Field
0       4     magic "STDM"
4       1     format version (1)
5       1     reserved (0)
6       2     cycle period (ms): the simulator's cycle period
8       1     boolean variables count (1 byte each)
9       1     INT variables count
10      1     WORD variables count
11      1     32-bit variables count (DINT, DWORD, TIME, internal numeric)
12      1     I/O entries count (at most the number of pins)
13      1     system variables count (at most 6)
14      1     routines count (at most 250)
15      1     scanned routines count (at most the routines count)
16      1     maximum stack depth (cells)
17      1     maximum call depth
18      2     code size (bytes)
20      2     CRC-16/CCITT-FALSE of the whole image, this field excluded (bytes 0 to 19, then 22 to the end)
22      4     image identifier (CRC-32/ISO-HDLC of the image, CRC-16 and identifier fields zeroed)
26      ...   I/O table          3 bytes per entry
...     ...   system variables   2 bytes per entry
...     ...   routines table     2 bytes per entry: start offset in the code
...     ...   code
```

Header: 26 bytes. Image size: `26 + 3·ioCount + 2·sysCount + 2·routineCount + codeSize` bytes,
compared to `limits.programStorageBytes` (§10). The total number of variables
`varCount = boolCount + intCount + wordCount + int32Count` is at most 250, like `routineCount`
(indices are one byte): enough for the Uno R3, to raise through a `formatVersion` change if another
target needs it.

**The image is self-validating** (magic, CRC, structure, §7.1): it is stored at address 0 of the
EEPROM with no loading header, so the whole EEPROM stays available, and an interrupted write simply
yields an image refused at startup.

**Image identifier.** It identifies the program held by a board: the VM does not compute it, it
reports it on the serial link, and the application compares it to the identifier of the image it
would generate for the open project. `crc16` remains the integrity check, `imageId` an identity:
the two are not interchangeable. `imageId` identifies an *image*, not a project: any change to the
generator that changes the produced code (encoding choice, optimisation) changes `imageId` for an
unchanged project. After a Studomate update, a board programmed by the previous version therefore
shows as running another program, which the application presents as such (offer to reload), not as
an error.

### 3.1. Variable index and layout

Variables are indexed from 0 to `varCount - 1`, **stored by storage class**: first the `boolCount`
1-byte variables, then the `intCount` `INT`, then the `wordCount` `WORD`, then the `int32Count`
4-byte variables. The class of a variable follows from its index, and its RAM address is computed
without a table:

```
i < b                 : offset = i                                   (1 byte, boolean)
i < b + n             : offset = b + 2·(i - b)                       (2 bytes, INT)
i < b + n + w         : offset = b + 2·(i - b)                       (2 bytes, WORD)
otherwise             : offset = b + 2·(n + w) + 4·(i - b - n - w)   (4 bytes)
with b = boolCount, n = intCount, w = wordCount
```

Within a class the order follows `CompiledProject.variables` (then the system variables): it is
**stable** from one generation to the next for the same project, which the telemetry relies on. No
memory variable takes room in the image. Only the variables read or written by the embedded code,
or wired to a pin, get an index (unused variables, including the observation variables of
transition conditions, take neither an index nor RAM). Every variable is 0 / false at startup (the
model has no initial value). The layout returned by the generator (`BytecodeLayout`) gives the
index of each variable by name (`variableIndexByName`), and `decodeVariableMemory` turns a copy of
the VM memory into values by name.

### 3.2. I/O table (3 bytes per physical input or output)

```
byte 0: variable index
byte 1: role     (bits 0-2): 0 digital input, 1 digital input with pull-up, 2 analog input,
                             3 digital output, 4 PWM output
        inverted (bit 3)   : digital inputs, the variable is true when the pin is at 0 (`inverted` field)
        bits 4-7: reserved (0)
byte 2: pin, numbering of the serial protocol: D2 to D13 = 2 to 13, A0 to A5 = 14 to 19
        (the accepted range is a property of the target's firmware: 2 to 19 on the Uno R3)
```

### 3.3. System variables table (2 bytes per variable)

```
byte 0: variable index (always in the 1-byte class)
byte 1: system identifier
```

Identifiers: `0` `_SYS_FIRST_SCAN`, `1` `_SYS_TB_100ms`, `2` `_SYS_TB_200ms`, `3` `_SYS_TB_500ms`, `4`
`_SYS_TB_1s`, `5` `_SYS_TB_2s`. Only the system variables actually referenced are embedded.

### 3.4. Routines table (2 bytes per routine)

Offset of each routine in the code section. The first `scanCount` routines are **scanned** on every
cycle, in order: grafcets, step memories, initialisation, then Main (the order of
`CompiledProject.routines`, **without** the observation routine, §11). The following ones are
routines reached by `CALL`. Offsets are **strictly increasing** and the first one is 0: routine `r`
extends from its offset to that of `r + 1` (excluded), the last one to `codeSize`. The last
instruction of each routine is a `RET`, and it is the routine's only `RET`: execution cannot run
over into the next routine. A routine holds no dead code: any instruction following a `JMP` is the
target of a jump (§7.1).

## 4. Instruction set

Stack of 32-bit cells. `v`, `w`: variable index (1 byte). `t`: type code (1 byte, §2). `a`: absolute
address in the code section (2 bytes). `r`: routine index (1 byte). The stack effect reads
`before → after`.

### 4.1. Constants and variables

| Opcode | Mnemonic | Operands | Stack | Effect |
|---|---|---|---|---|
| `01` | `PUSH0` | | `→ 0` | Push 0 |
| `02` | `PUSH1` | | `→ 1` | Push 1 |
| `03` | `PUSH8` | imm8 (signed) | `→ n` | Push the sign-extended constant |
| `04` | `PUSH16` | imm16 (signed) | `→ n` | Same |
| `05` | `PUSH32` | imm32 | `→ n` | Push the 32-bit pattern |
| `06` | `LOAD` | `v` | `→ x` | Push a variable (sign-extended for `INT`, zero-extended for `WORD`) |
| `07` | `STORE` | `v` | `x →` | Pop and write, wrapped to the variable's storage class (§2) |
| `08` | `POP` | | `x →` | Pop and discard |
| `09` | `COPY` | `v w` | | Write variable `v` into `w`: the effect of `LOAD v ; STORE w` |
| `0A` | `SETIF` | `v` | `c →` | Pop; if `c` is not 0, write 1 into `v` (wrapped like `STORE`) |
| `0B` | `RSTIF` | `v` | `c →` | Pop; if `c` is not 0, write 0 into `v` |

A constant outside int32 (for example a `DWORD` above 2^31-1) is pushed with `PUSH32` as its bit
pattern; the type of the consuming operation fixes its interpretation.

**Encoding choice.** The generator first computes the 32-bit pattern of the constant under the cell
convention of its type (§2), then picks the shortest of `PUSH0`, `PUSH1`, `PUSH8`, `PUSH16` and
`PUSH32` whose pushed value (after sign extension for `PUSH8` and `PUSH16`) reproduces that pattern
exactly. A `WORD` constant of 40000 (pattern `0x00009C40`) is therefore a `PUSH32`: with `PUSH16`,
sign extension would give `0xFFFF9C40`, and the unsigned comparison with a `WORD` variable
(zero-extended) would be wrong. Constants are integers: operations between literals are already
folded by the simplifier, and a remaining non-integer constant is a generator error.

### 4.2. Arithmetic and conversions (wrapped to the result type)

| Opcode | Mnemonic | Operands | Stack | Effect |
|---|---|---|---|---|
| `10` | `ADD` | `t` | `a b → a+b` | Addition, wrapped to type `t` |
| `11` | `SUB` | `t` | `a b → a-b` | Subtraction |
| `12` | `MUL` | `t` | `a b → a*b` | Multiplication |
| `13` | `DIV` | `t` | `a b → a/b` | Integer division truncated toward zero. **Fault if `b` is 0.** `-2^31 / -1` gives `-2^31` |
| `14` | `NEG` | `t` | `a → -a` | Negation |
| `15` | `CONV` | `t` | `a → a'` | Wraps `a` to type `t` (the `*_TO_*` functions) |

- **Allowed types.** Arithmetic on bit strings (`WORD`, `DWORD`) is refused by the analysis: `ADD`,
  `SUB`, `MUL`, `DIV` and `NEG` only carry types 1 (`INT`), 3 (`DINT`), 5 (`TIME`) or 6 (internal).
  The generator throws on any other type. `CONV` accepts types 1 to 5.
- **Wrapping.** Type 1: truncated to 16 bits, then sign-extended. Types 3, 5, 6: 32-bit pattern
  unchanged. Types 2 and 4 (`CONV` only): truncated to 16 bits with zero extension, or pattern
  unchanged.
- **No undefined behaviour.** `ADD`, `SUB`, `MUL` and `NEG` are computed in `uint32_t` then
  reinterpreted by type: the result modulo 2^32 is exactly the expected wrapping. A 32-bit product
  is enough, no 64-bit multiplication is needed (for `INT`, operands fit in 16 bits and the product
  is exact before wrapping).
- **`DIV`.** Operands are int32 (every allowed type is signed). `b = 0`: execution fault.
  **`a = -2^31` and `b = -1`: the result is `a`** (the quotient 2^31 wrapped to 32 bits), handled
  explicitly because it is undefined in C and raises a hardware exception on x86. Otherwise C
  division (truncated toward zero since C99), then wrapped to the type. The quotient is always an
  integer, `TIME` and internal variables included: the simulator truncates the same way
  (`T#5s / 3` is 1666 ms).

### 4.3. Comparison and logic

| Opcode | Mnemonic | Operands | Stack | Effect |
|---|---|---|---|---|
| `20` | `CMP` | `c` | `a b → 0/1` | Compare. `c` bits 0 to 2: 0 `=`, 1 `!=`, 2 `<`, 3 `<=`, 4 `>`, 5 `>=`. Bit 3: unsigned (for `WORD` and `DWORD`) |
| `21` | `NOT` | | `a → !a` | 1 if `a` is 0, else 0 |
| `22` | `AND` | `v` | `a → a∧v` | 1 if `a` and the boolean variable `v` are both not 0, else 0 |
| `23` | `ANDN` | `v` | `a → a∧¬v` | 1 if `a` is not 0 and `v` is 0, else 0 |
| `24` | `OR` | `v` | `a → a∨v` | 1 if `a` or `v` is not 0, else 0 |
| `25` | `ORN` | `v` | `a → a∨¬v` | 1 if `a` is not 0 or `v` is 0, else 0 |

The operands of a comparison have the same type after unification (`unifyNumericTypes`). The
language never mixes signed and unsigned (the only widenings are `INT`→`DINT` and
`WORD`→`DWORD`): the unsigned bit is set if and only if that type is `WORD` or `DWORD`. Booleans
compare as the integers 0 and 1.

The operand `v` of `AND`, `ANDN`, `OR` and `ORN` is a variable of the 1-byte class. Reading a
variable has no effect, so these opcodes evaluate it unconditionally: the result is the one the
short-circuit form (§4.4) would give.

### 4.4. Jumps

| Opcode | Mnemonic | Operands | Stack | Effect |
|---|---|---|---|---|
| `30` | `JMP` | `a` | | Jump |
| `31` | `JZ` | `a` | `x →` | Pop, jump if 0 |
| `32` | `JNZ` | `a` | `x →` | Pop, jump if not 0 |
| `33` | `JZK` | `a` | `x → x` or `x →` | If the top is 0: jump **keeping** it. Otherwise pop and continue (**AND**) |
| `34` | `JNZK` | `a` | `x → x` or `x →` | If the top is not 0: jump keeping it. Otherwise pop and continue (**OR**) |

**Every jump goes forward**, inside the routine that holds it (the language has no loop): a cycle
always ends, which the load-time verification checks (§7.1).

Short-circuit evaluation is mandatory: a guarded expression (`b != 0 AND a / b > 1`) must not raise
the division by zero of the protected branch. It also has an observable effect on blocks: a timer
or counter placed in the right operand of an `AND` whose left operand is false is not evaluated, as
in the simulator.

`a AND b` is generated `a ; JZK end ; b ; end:` (the result is `a` if `a` is 0, otherwise `b`).
`a OR b` is `a ; JNZK end ; b ; end:`. Operands are booleans (0 or 1). When `b` is a variable
or the `NOT` of a variable, the generator emits `a ; AND v` (`ANDN`, `OR`, `ORN`) instead (§4.3).

### 4.5. Calls and blocks

| Opcode | Mnemonic | Operands | Stack | Effect |
|---|---|---|---|---|
| `40` | `CALL` | `r` | | Call routine `r` (the stack must be empty) |
| `41` | `RET` | | | End of routine |
| `50` | `TIMER` | `k lastIn elapsed out` | `in pt → q` | Native timer block (§5) |
| `51` | `COUNTER` | `k lastIn current out` (+ `downLast downOut` for `CTUD`) | see §6 | Native counter block (§6) |

A conditional call (`user-program` block) is generated `cond ; JZ skip ; CALL r ; skip:`.

## 5. `TIMER` block

Operands: `k` (0 `TON`, 1 `TOF`, 2 `TP`), then `lastIn`, `elapsed` and `out` (variable indices:
edge memory, elapsed time, output). Before the opcode, the generator pushes **in this order** the
input expression (`IN`, boolean), then the preset (`PT`, in ms). This is the simulator's evaluation
order, which also decides which fault comes first if both expressions contain one. The opcode pops
`PT`, then `IN`, and pushes `Q` (the output).

It reproduces `TimerNodeEvaluator.evaluate` exactly (this document is the source of truth for the
VM), with `dt` the elapsed time of the cycle (§7.3) and comparisons on `ET` and `PT` signed
(int32):

- `risingEdge = IN && !last`, `fallingEdge = !IN && last`. `ET` and `Q` are read from their
  variable.
- **TON**: rising edge → output 0 (without touching `ET`); otherwise if `IN`: `ET >= PT` → output
  1, else output 0 and `ET := ET + dt`; if `!IN`: `ET := 0`, output 0.
- **TOF**: if `IN`: `ET := 0`, output 1; otherwise if falling edge: output 1; otherwise, if `Q`
  (read before it is written) and `ET < PT`: output 1 and `ET := ET + dt`, else output 0.
- **TP**: `running = Q`; if `!running && risingEdge`: `ET := 0`, output 1; otherwise if
  `running && ET < PT`: output 1 and `ET := ET + dt`; otherwise output 0, and if `!IN`: `ET := 0`.
- Common end: `Q := output`; `last := IN`; push the output.

Every write goes through `STORE` semantics (wrapped to the class of the target variable).

`PT` and `ET` are never `WORD` or `DWORD`: the analysis refuses it (`BIT_STRING_BLOCK_OPERAND`),
because the 4-byte class does not tell `DWORD` from `DINT` and the block's comparisons are signed.
The generator throws if it meets one.

## 6. `COUNTER` block

Operands: `k` (0 `CTU`, 1 `CTD`, 2 `CTUD`), `lastIn`, `current`, `out`, and for `CTUD` `downLast`,
`downOut`. Before the opcode, the generator pushes, in the simulator's evaluation order: `CU`/`CD`
(counting input), `R`/`LD` (control), `PV` (preset) and, for `CTUD`, `CD` (down input) then `LD`.
The opcode pops in reverse order and pushes the output (`Q`, or `QU` for `CTUD`).

| Kind | Pops (top first) | Pushes |
|---|---|---|
| `CTU`, `CTD` | `PV`, control, input | `Q` |
| `CTUD` | `LD`, `CD`, `PV`, `R`, `CU` | `QU` (`QD` is written to `downOut`) |

It reproduces `CounterNodeEvaluator.evaluate`: counting on rising edges (`input && !last`), the
control input being level-based and having priority (`CTU`: current value to 0; `CTD`: to `PV`;
`CTUD`: `R` has priority over `LD`), output `current >= PV` (`CTU`, `QU`) or `current <= 0` (`CTD`,
`QD`), signed comparisons, no saturation of the counter (increment and decrement are computed in
`uint32_t`, §4.2).

**Outputs compare the new current value after its wrapping** to the class of its variable, that is
the value read back after `current` was written, as in the simulator: an `INT` counter going from
32767 to 32768 is -32768, and `QU` is `-32768 >= PV` from that cycle. Writes happen in this order:
`last`, `current`, then `out` (and `downLast`, `downOut` for `CTUD`), each wrapped to the class of
its variable.

`PV` and `current` are never `WORD` or `DWORD` (same analysis rule as §5).

## 7. VM cycle

The VM reads the code **directly from the storage** (the EEPROM on the Uno R3), with no copy in
RAM (1 KB of image for 2 KB of RAM). The portable C core reads it through the platform interface
(`read_byte(addr)`, like I/O and the clock): an EEPROM read on the board, an in-memory array in the
native executable of the conformity tests.

### 7.1. Loading and verification

At startup (and after each transfer), the VM validates the image before running anything:

1. `magic`, known `formatVersion`, reserved byte at 0, and total size (§3) ≤ storage capacity,
   **before** reading past the header.
2. CRC (§3).
3. Structural verification, in one pass over the code:
   - tables: variable indices < `varCount`, 1-byte class for system variables, valid roles and
     pins, routine offsets < `codeSize`, `scanCount ≤ routineCount`;
   - routines: strictly increasing offsets, the first one at 0, each routine ended by its single
     `RET` (§3.4);
   - code: known opcodes, operands entirely inside the routine, indices `v` < `varCount`, indices
     `r` < `routineCount`, types `t` allowed for the opcode (§4.2), the operand of `AND`, `ANDN`,
     `OR` and `ORN` of the 1-byte class (§4.3);
   - jumps and stack: see below;
   - the variable operands of `TIMER` and `COUNTER` name the right class (`lastIn`, `out`,
     `downLast`, `downOut`: 1-byte class; `elapsed` and `current`: `INT` or 4-byte class, never
     `WORD`).
4. Required RAM (§10) ≤ available RAM.

**Jumps and stack.** The pass keeps a **table of pending targets**, sorted by address, of at most
`MAX_PENDING_TARGETS` = 16 entries `(address, depth)` (a constant of `formatVersion` 1). It is
emptied at the start of each routine, with a current depth of 0.

- **Jump met**: the target must be strictly ahead and at most at the offset of the `RET` of the
  current routine. The depth expected at the target is the current depth after the jump for `JMP`,
  `JZ` and `JNZ` (after the condition is popped), and the depth before the jump for `JZK` and
  `JNZK` (the kept value). If the table already holds this address, the two depths must be equal
  and no entry is added; otherwise the entry is inserted, and a full table makes the image refused.
- **Start of the instruction at address `pc`**: if the smallest pending address is lower than `pc`,
  that target falls in the middle of the operands of an instruction, and the image is refused. If
  it equals `pc`, the entry is removed and its depth is compared with the current depth. Right
  after a `JMP` there is no current depth: the instruction must be a pending target (otherwise it
  is dead code and the image is refused), and its depth becomes the current depth.
- **Effect of each instruction** (§4): the depth is never negative, never exceeds `maxStack`, and
  is 0 on every `CALL` and on the `RET`. At the `RET`, the table is empty.

Since all jumps go forward and each target is checked at the latest when the pass reaches it, one
pass is enough. This verification makes a run-time stack check unnecessary: it also guarantees the
absence of underflow, and `maxStack` is not taken on trust.

A refused image is never run: the VM stays idle (remote I/O remains available) and reports the
invalid image on the serial link. The call depth is checked at run time (a corrupted image with a
valid CRC could contain a cycle of calls): exceeding `maxCallDepth` is an execution fault. The
stack, checked statically, needs no such check.

`verifyBytecode` (TypeScript) applies the same rules as `stdm_vm_verify` (C); both are compared on
byte corruptions of valid images. The test suite applies the TypeScript verifier to every image the
generator produces (§9).

### 7.2. Startup

Before the first cycle: digital outputs are configured as outputs at the low level and PWM outputs
at 0; the debounce state of each digital input is initialised from a raw read of the pin. The
hardware watchdog is armed (§7.5).

### 7.3. Steps of a cycle

Same steps as `PLC.tick`:

1. **Read the inputs**: each input variable receives the value of its pin. Digital input: the
   debounced state, with inversion applied. Analog input: average of 4 consecutive conversions made
   at that moment, raw value 0 to 1023. As in the remote I/O firmware (`updateDebounce`), debouncing
   does not depend on the cycle: digital inputs are sampled on every turn of the main loop,
   between two cycles included, and a new state is only retained after 5 ms of stability (not
   configurable per pin).
2. **Time**: `dt` = 0 on the first cycle after startup, then `k × cyclePeriodMs` (§7.4). This first
   cycle reproduces the establishment cycle of `SimulationManager.startSimulation` (`pause`,
   `stepOnce`, `resume` right after `start`): in continuous mode, `PLC`/`ClockedRunnable` alone
   would give `dt = cyclePeriodMs` from the first beat. A test harness comparing the VM with the
   simulator must therefore run that establishment cycle on the simulator side.
3. **System variables**: for each referenced `_SYS_TB_*` time base,
   `phase = (phase + dt) mod period` and `level = (2 × phase < period)`. The phase is stored on 16
   bits (it stays under the period, at most 2000 ms), but the sum `phase + dt` is computed on 32
   bits: when catching up (§7.4), `dt` can exceed 65535 ms. `_SYS_FIRST_SCAN` is 1 on the first
   cycle only. These writes precede the execution of the routines.
4. **Routines**: execution, in order, of the first `scanCount` routines.
5. **Outputs**: each output variable is written to its pin (digital output: high level if true;
   PWM output: value saturated to 0..255).

### 7.4. Clock

The VM keeps a reference `lastTick` (a `millis()` value, `uint32_t`). A cycle starts as soon as
`elapsed = millis() - lastTick` (unsigned subtraction, correct when `millis()` wraps to zero after
about 49 days) reaches `cyclePeriodMs`: then `k = elapsed / cyclePeriodMs` (at least 1, more if a
cycle took longer than one period), `dt = k × cyclePeriodMs` and `lastTick += k × cyclePeriodMs`.
The remainder of the division stays in `lastTick`: no drift accumulates.

The simulator has the same rule (`ClockedRunnable.consumeElapsedMs`), but in continuous mode `k` is
always 1 there: a `setInterval` beat that comes late is not caught up, simulated time slows down.
The conformity scenarios therefore drive the native VM with a virtual clock (`k = 1` on every
cycle), never with real time.

### 7.5. Execution fault

Division by zero, call depth exceeded: the VM stops, sets every output to 0 and enters the fault
state. Fault codes (`stdm_fault`): 0 none, 1 division by zero, 2 call depth, 3 watchdog, 4 invalid
image.

**Hardware watchdog** (the AVR WDT, in interrupt-then-reset mode, about one second per stage,
rearmed on every turn of the main loop): it covers a hang of the firmware itself, which no valid
image can cause (§7.1). The interrupt stores a marker in uninitialised RAM, then the reset occurs.
After that reset the pins are high-impedance until startup. At startup the firmware recognises the
marker (a serial reset or a power-up does not leave it, since the bootloader clears `MCUSR`) and
goes straight to the "watchdog" fault state instead of restarting the program, which avoids a loop
of resets. Long operations outside the cycle (writing the image to the EEPROM, about 3.3 ms per
byte) rearm the watchdog as they go.

- **Reporting**: the fault state and its code are exposed through the serial protocol (`STATUS`).
  The built-in LED (D13) blinks, only if the project does not assign D13.
- **Recovery**: by reset or power cycle (a watchdog reset does not count, see above); the VM then
  restarts the program from the initial state (§7.2). The simulator stops the simulation on the
  same error: the conformity scenarios therefore also compare the presence and the cycle of the
  fault.

**Forcing and remote writes.** The VM keeps one bit per variable (`forced`): a forced variable
keeps the imposed value whatever the program (or a pin) writes, as `PLC.forceVariable` does in the
simulator (`stdm_vm_force`, `stdm_vm_release`, `stdm_vm_release_all`). `stdm_vm_set_variable`
writes a variable from outside the program. The variable memory, laid out as in §3.1, and a cycle
counter modulo 65536 are readable (`stdm_vm_memory`, `stdm_vm_cycle_count`): they feed the
telemetry, which tells two snapshots of the memory apart by their cycle.

## 8. Code generation (generator rules)

- **Expression**: depth-first traversal, left operand then right operand. Arithmetic, `NEG` and
  `CONV` carry the result type of the node (`NumericTypeAnalyserVisitor`); a node of type
  `ANY_NUM` (internal variable) takes type 6.
- **Assignment**: `expression ; STORE v`, or `COPY w v` when the expression is a variable `w`.
  **`if`**: `condition ; JZ else ; true branch ; JMP end ; else: false branch ; end:`. An `if`
  with no `else` whose true branch is the single assignment of the constant 1 or 0 (boolean or
  integer literal) is generated `condition ; SETIF v` or `condition ; RSTIF v`.
- **Logical operators**: `a ; AND v`, `a ; ANDN v`, `a ; OR v`, `a ; ORN v` when the right
  operand is a boolean variable or its `NOT`, otherwise the short-circuit form of §4.4. Any instruction of an
  instruction list (a routine or the branch of an `if`) that leaves a value (a timer or counter
  block whose output is ignored) is followed by a `POP`: every instruction leaves the stack at the
  depth where it found it.
- **Variables**: stored by class (§3.1), in the order of `CompiledProject.variables` within each
  class, plus the referenced system variables. A variable missing from the table is a generator
  error, never a silent case.
- **Generator errors** (never silent): type `REAL` or `STRING`, non-integer constant, arithmetic on
  `WORD`/`DWORD`, `WORD`/`DWORD` as `PT`, `ET`, `PV` or `CV`, comparison between types of different
  signs, a called routine that does not exist. They point to a gap in the analysis, to fix on the
  analyser side.
- **Depths**: `maxStack` is the maximum stack depth computed statically over all routines;
  `maxCallDepth` the maximum depth of the call graph (acyclic, guaranteed by the analyser:
  `BLOCK_PROGRAM_CALL_CYCLE`).
- Jump addresses and routine offsets are resolved by the generator in two passes.
- **Verification constraints**: the generator produces no dead code and never exceeds
  `MAX_PENDING_TARGETS` pending targets (§7.1). An overflow (conditions nested too deep) is
  reported as an admissibility error (§10), not as a generator error.
- `imageId` is computed last, over the complete image (`crc16` and `imageId` at 0), then `crc16`
  over the image that contains `imageId`.

## 9. Generator conformity to verification

The generator always produces an image that passes the verification of §7.1: the generator's test
suite applies the TypeScript verifier to every image it produces.

## 10. Size and memory (basis of the admissibility check)

- **Image size**: `26 + 3·ioCount + 2·sysCount + 2·routineCount + codeSize`, compared to
  `programStorageBytes` (1024 bytes on the Uno R3, the whole EEPROM).
- **VM capacities**: the variable array, the evaluation stack and the call stack of the instance
  are sized statically in the firmware (`STDM_VM_MEM_BYTES`, `STDM_VM_MAX_STACK`,
  `STDM_VM_MAX_CALL_DEPTH`). The descriptor holds them (`limits.vm`: `variableBytes`, `maxStack`,
  `maxCallDepth`) and the admissibility check compares each resource to its capacity. The value of
  the descriptor and that of the firmware must stay identical.
- **VM RAM**: `boolCount + 2·(intCount + wordCount) + 4·int32Count` (variables) + `4 × maxStack` +
  `2 × maxCallDepth` (return addresses) + `2 × sysCount` (time base phases) + the debounce state of
  each digital input + a few control bytes. The pending targets table of the verification (§7.1,
  `3 × MAX_PENDING_TARGETS` = 48 bytes) is only used at load time: it shares the variable area,
  still unused at that moment, and only counts if that area is smaller. The result is compared to
  the RAM budget of the descriptor (`ramBytes`, 2048 bytes on the Uno R3, minus the Arduino core,
  the serial buffers and the I/O server).
- The report of an overflow gives the computed size, the limit, and the routine whose code is the
  largest.

`checkAdmissibility(image, limits)` compares an image to the limits of a target descriptor
(`HardwareDeviceDescriptor["limits"]`) and returns the issues, with exact sizes: image too large
(and the heaviest routine), variable memory, stack depth, call depth, jump nesting
(`JUMP_NESTING_EXCEEDED`).

## 11. Known differences from the simulator

Left out of the conformity scenarios:

1. **Product precision**: the simulator computes in 64-bit floating point (exact up to 2^53) then
   wraps; the VM computes exactly modulo 2^32. A `DINT × DINT` product above 2^53 therefore
   differs. The scenarios stay under that bound.
2. **`TIME` and internal numeric variables**: the simulator does not bound them; the VM wraps them
   on 32 bits (about 24.8 days in milliseconds). The scenarios stay under 2^31 ms.
3. **Observation routine** (`transition condition variable := …` per transition, appended at the
   end of `routines`): it only serves the interface (highlighting transitions, elapsed time). It is
   not embedded: when observing a board, the host replays it on the values received from the
   telemetry.
4. **Time catch-up**: the VM catches up lost periods (`k > 1`, §7.4), the simulator does not.
5. **Strings and reals**: excluded by the analysis.
6. **Pause and step by step**: specific to the simulator, with no equivalent in autonomous mode.

## 12. Adding a target

The format knows nothing about a particular board. A target provides:

1. a descriptor in `src/hardware/` with its limits (`programStorageBytes`, `vm` capacities);
2. an adapter producing `IoBinding[]` (variable, role, pin number, inverted), like
   `src/bytecode/arduino-io-bindings.ts`;
3. a VM platform (read the image, clock, pins), like `firmwares/arduino/uno-r3/`.

## 13. Tests

- `bytecode.generator.test.ts`, `bytecode.verifier.test.ts`, `bytecode.admissibility.test.ts`,
  `variable-memory.test.ts`: unit tests.
- `vm.native.test.ts`: compiles the VM for the development machine (system `cc`, with the
  undefined-behaviour sanitizer) and runs images under a virtual clock. The native binary depends
  on the OS and the processor: it is not versioned, the test suite builds it on the fly.
- `vm.conformity.test.ts`: runs the project templates and typed programs in both the simulator and
  the native VM, and compares outputs, memory variables and active steps cycle by cycle, as well as
  the presence and the cycle of a fault.
- `vm.templates-size.test.ts`: the reference templates fit the Uno R3.
- Test helpers: `tests/utils/bytecode-program.ts` (hand-built projects, disassembler),
  `native-vm.ts`, `vm-conformity.ts`.
