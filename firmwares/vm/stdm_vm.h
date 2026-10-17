/*
 * Studomate bytecode virtual machine: portable C core (no Arduino dependency).
 * Format and semantics: BYTECODE-SPEC.md.
 *
 * The image is read through `read_byte` (EEPROM on the board, an array in the native test
 * executable); pins, clock and code storage are all behind `stdm_platform`.
 */
#ifndef STDM_VM_H
#define STDM_VM_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define STDM_FORMAT_VERSION 1
#define STDM_HEADER_SIZE 26
#define STDM_MAX_INDEXED 250
#define STDM_MAX_PENDING_TARGETS 16
#define STDM_SYSTEM_VARIABLE_COUNT 6

/*
 * Capacities of one VM instance (RAM). A target defines them in a `stdm_config.h` placed next to
 * this header; they must then equal `limits.vm` of its descriptor in `src/hardware/`.
 */
#if defined(__has_include)
#if __has_include("stdm_config.h")
#include "stdm_config.h"
#endif
#endif
#ifndef STDM_VM_MEM_BYTES
#define STDM_VM_MEM_BYTES 1024
#endif
#ifndef STDM_VM_MAX_STACK
#define STDM_VM_MAX_STACK 32
#endif
#ifndef STDM_VM_MAX_CALL_DEPTH
#define STDM_VM_MAX_CALL_DEPTH 8
#endif

/* Roles of the I/O table. */
enum {
	STDM_ROLE_DIGITAL_INPUT = 0,
	STDM_ROLE_DIGITAL_INPUT_PULLUP = 1,
	STDM_ROLE_ANALOG_INPUT = 2,
	STDM_ROLE_DIGITAL_OUTPUT = 3,
	STDM_ROLE_PWM_OUTPUT = 4
};

typedef struct stdm_platform {
	void *ctx;
	/* Byte `addr` of the image (0 is the first byte of the header). */
	uint8_t (*read_byte)(void *ctx, uint16_t addr);
	uint32_t (*millis)(void *ctx);
	/* Prepares a pin for a role (STDM_ROLE_*). Called once at start. */
	void (*configure_pin)(void *ctx, uint8_t pin, uint8_t role);
	/* Debounced level of a digital input, 0 or 1. */
	uint8_t (*read_digital)(void *ctx, uint8_t pin);
	/* Analog input averaged over 4 conversions, 0..1023. */
	uint16_t (*read_analog)(void *ctx, uint8_t pin);
	void (*write_digital)(void *ctx, uint8_t pin, uint8_t level);
	void (*write_pwm)(void *ctx, uint8_t pin, uint8_t value);
} stdm_platform;

/* Why an image was refused. */
typedef enum {
	STDM_OK = 0,
	STDM_ERR_TOO_SHORT,
	STDM_ERR_MAGIC,
	STDM_ERR_VERSION,
	STDM_ERR_RESERVED,
	STDM_ERR_CAPACITY,
	STDM_ERR_CRC,
	STDM_ERR_COUNTS,
	STDM_ERR_IO_TABLE,
	STDM_ERR_SYS_TABLE,
	STDM_ERR_ROUTINE_TABLE,
	STDM_ERR_OPCODE,
	STDM_ERR_OPERANDS,
	STDM_ERR_VARIABLE,
	STDM_ERR_ROUTINE_INDEX,
	STDM_ERR_TYPE,
	STDM_ERR_BLOCK_OPERAND,
	STDM_ERR_JUMP,
	STDM_ERR_STACK,
	STDM_ERR_RET,
	STDM_ERR_RAM
} stdm_status;

typedef enum {
	STDM_FAULT_NONE = 0,
	STDM_FAULT_DIVISION_BY_ZERO = 1,
	STDM_FAULT_CALL_DEPTH = 2,
	STDM_FAULT_WATCHDOG = 3,
	STDM_FAULT_INVALID_IMAGE = 4
} stdm_fault;

typedef struct stdm_vm {
	const stdm_platform *platform;
	uint16_t cycle_period_ms;
	uint8_t bool_count, int_count, word_count, int32_count;
	uint8_t io_count, sys_count, routine_count, scan_count;
	uint8_t max_call_depth;
	uint16_t io_start, sys_start, routines_start, code_start, code_size;
	uint8_t fault;
	uint8_t first_cycle;
	uint16_t cycle_count;
	/* One bit per variable: a forced variable keeps its value whatever the program writes. */
	uint8_t forced[(STDM_MAX_INDEXED + 7) / 8];
	uint32_t last_tick;
	uint16_t sys_phase[STDM_SYSTEM_VARIABLE_COUNT];
	uint32_t stack[STDM_VM_MAX_STACK];
	uint16_t call_stack[STDM_VM_MAX_CALL_DEPTH];
	uint8_t memory[STDM_VM_MEM_BYTES];
} stdm_vm;

/* Checks the whole image (§7.1 of BYTECODE-SPEC.md); `capacity` is the storage available to it. */
stdm_status stdm_vm_verify(const stdm_platform *platform, uint16_t capacity);

/* Verifies the image, then prepares the VM and the pins. Nothing runs before a successful start. */
stdm_status stdm_vm_start(stdm_vm *vm, const stdm_platform *platform, uint16_t capacity);

/* Runs one cycle if one is due (the first one right away). Returns 1 if a cycle ran. */
uint8_t stdm_vm_poll(stdm_vm *vm);

uint8_t stdm_vm_fault(const stdm_vm *vm);
/* Cycles run since the start, modulo 65536: tells a snapshot of the memory from the next one. */
uint16_t stdm_vm_cycle_count(const stdm_vm *vm);
/* Variable memory of the program, as laid out by the image (BYTECODE-SPEC.md §3.1), and its size in bytes. */
const uint8_t *stdm_vm_memory(const stdm_vm *vm);
uint16_t stdm_vm_memory_size(const stdm_vm *vm);
uint8_t stdm_vm_variable_count(const stdm_vm *vm);
/* Value of a variable as the program sees it (INT signed, WORD unsigned, 4-byte class as int32). */
int32_t stdm_vm_get_variable(const stdm_vm *vm, uint8_t index);
void stdm_vm_set_variable(stdm_vm *vm, uint8_t index, int32_t value);
/*
 * Imposes a value on a variable until it is released: the program's writes (and the pins) no
 * longer change it. Returns 0 for an index that is not a variable.
 */
uint8_t stdm_vm_force(stdm_vm *vm, uint8_t index, int32_t value);
uint8_t stdm_vm_release(stdm_vm *vm, uint8_t index);
void stdm_vm_release_all(stdm_vm *vm);

#ifdef __cplusplus
}
#endif

#endif
