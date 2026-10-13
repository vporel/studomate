#include "stdm_vm.h"

#include <stddef.h>

/* Opcodes (README §4). */
enum {
	OP_PUSH0 = 0x01, OP_PUSH1 = 0x02, OP_PUSH8 = 0x03, OP_PUSH16 = 0x04, OP_PUSH32 = 0x05,
	OP_LOAD = 0x06, OP_STORE = 0x07, OP_POP = 0x08,
	OP_ADD = 0x10, OP_SUB = 0x11, OP_MUL = 0x12, OP_DIV = 0x13, OP_NEG = 0x14, OP_CONV = 0x15,
	OP_CMP = 0x20, OP_NOT = 0x21,
	OP_JMP = 0x30, OP_JZ = 0x31, OP_JNZ = 0x32, OP_JZK = 0x33, OP_JNZK = 0x34,
	OP_CALL = 0x40, OP_RET = 0x41,
	OP_TIMER = 0x50, OP_COUNTER = 0x51
};

/* Opcode counter of the native test driver (not compiled into the firmware). */
#ifdef STDM_TRACE_OPS
extern uint32_t stdm_executed_ops;
#define STDM_COUNT_OP() (stdm_executed_ops++)
#else
#define STDM_COUNT_OP() ((void)0)
#endif

/* Type codes (README §2). */
enum {
	T_BOOL = 0, T_INT = 1, T_WORD = 2, T_DINT = 3, T_DWORD = 4, T_TIME = 5, T_INTERNAL = 6
};

enum { CLASS_BOOL = 0, CLASS_INT = 1, CLASS_WORD = 2, CLASS_INT32 = 3 };

static const uint16_t TIME_BASE_PERIOD_MS[STDM_SYSTEM_VARIABLE_COUNT] = {0, 100, 200, 500, 1000, 2000};

/* ------------------------------------------------------------------ image access */

typedef struct {
	uint8_t bool_count, int_count, word_count, int32_count;
	uint8_t io_count, sys_count, routine_count, scan_count;
	uint8_t max_stack, max_call_depth;
	uint16_t io_start, sys_start, routines_start, code_start, code_size, cycle_period_ms;
	uint16_t var_count;
} layout_t;

static uint8_t rb(const stdm_platform *p, uint16_t addr) { return p->read_byte(p->ctx, addr); }

static uint16_t ru16(const stdm_platform *p, uint16_t addr) {
	return (uint16_t)((uint16_t)rb(p, addr) | (uint16_t)((uint16_t)rb(p, (uint16_t)(addr + 1)) << 8));
}

static uint8_t class_of(const layout_t *l, uint8_t index) {
	if (index < l->bool_count) return CLASS_BOOL;
	if (index < (uint16_t)(l->bool_count + l->int_count)) return CLASS_INT;
	if (index < (uint16_t)(l->bool_count + l->int_count + l->word_count)) return CLASS_WORD;
	return CLASS_INT32;
}

static uint16_t variable_offset(const layout_t *l, uint8_t i) {
	uint16_t b = l->bool_count, n = l->int_count, w = l->word_count;
	if (i < b) return i;
	if (i < b + n + w) return (uint16_t)(b + 2u * (uint16_t)(i - b));
	return (uint16_t)(b + 2u * (uint16_t)(n + w) + 4u * (uint16_t)(i - b - n - w));
}

static void read_layout(const stdm_platform *p, layout_t *l) {
	l->cycle_period_ms = ru16(p, 6);
	l->bool_count = rb(p, 8);
	l->int_count = rb(p, 9);
	l->word_count = rb(p, 10);
	l->int32_count = rb(p, 11);
	l->io_count = rb(p, 12);
	l->sys_count = rb(p, 13);
	l->routine_count = rb(p, 14);
	l->scan_count = rb(p, 15);
	l->max_stack = rb(p, 16);
	l->max_call_depth = rb(p, 17);
	l->code_size = ru16(p, 18);
	l->var_count = (uint16_t)(l->bool_count + l->int_count + l->word_count + l->int32_count);
	l->io_start = STDM_HEADER_SIZE;
	l->sys_start = (uint16_t)(l->io_start + 3u * l->io_count);
	l->routines_start = (uint16_t)(l->sys_start + 2u * l->sys_count);
	l->code_start = (uint16_t)(l->routines_start + 2u * l->routine_count);
}

static uint16_t routine_offset(const stdm_platform *p, const layout_t *l, uint8_t r) {
	return ru16(p, (uint16_t)(l->routines_start + 2u * r));
}

/* ------------------------------------------------------------------ verification */

static uint16_t crc16_update(uint16_t crc, uint8_t byte) {
	uint8_t bit;
	crc ^= (uint16_t)((uint16_t)byte << 8);
	for (bit = 0; bit < 8; bit++) {
		crc = (crc & 0x8000u) ? (uint16_t)((crc << 1) ^ 0x1021u) : (uint16_t)(crc << 1);
	}
	return crc;
}

/* Operand length and stack effect of the fixed-shape opcodes. Returns 0 for an unknown opcode. */
static uint8_t opcode_shape(uint8_t op, uint8_t *operand_bytes, uint8_t *pops, uint8_t *pushes) {
	switch (op) {
	case OP_PUSH0: case OP_PUSH1: *operand_bytes = 0; *pops = 0; *pushes = 1; return 1;
	case OP_PUSH8: *operand_bytes = 1; *pops = 0; *pushes = 1; return 1;
	case OP_PUSH16: *operand_bytes = 2; *pops = 0; *pushes = 1; return 1;
	case OP_PUSH32: *operand_bytes = 4; *pops = 0; *pushes = 1; return 1;
	case OP_LOAD: *operand_bytes = 1; *pops = 0; *pushes = 1; return 1;
	case OP_STORE: *operand_bytes = 1; *pops = 1; *pushes = 0; return 1;
	case OP_POP: *operand_bytes = 0; *pops = 1; *pushes = 0; return 1;
	case OP_ADD: case OP_SUB: case OP_MUL: case OP_DIV: *operand_bytes = 1; *pops = 2; *pushes = 1; return 1;
	case OP_NEG: case OP_CONV: *operand_bytes = 1; *pops = 1; *pushes = 1; return 1;
	case OP_CMP: *operand_bytes = 1; *pops = 2; *pushes = 1; return 1;
	case OP_NOT: *operand_bytes = 0; *pops = 1; *pushes = 1; return 1;
	case OP_JMP: *operand_bytes = 2; *pops = 0; *pushes = 0; return 1;
	case OP_JZ: case OP_JNZ: *operand_bytes = 2; *pops = 1; *pushes = 0; return 1;
	case OP_JZK: case OP_JNZK: *operand_bytes = 2; *pops = 0; *pushes = 0; return 1;
	case OP_CALL: *operand_bytes = 1; *pops = 0; *pushes = 0; return 1;
	case OP_RET: *operand_bytes = 0; *pops = 0; *pushes = 0; return 1;
	default: return 0;
	}
}

typedef struct {
	uint16_t address;
	uint8_t depth;
} pending_t;

static stdm_status verify_routine(const stdm_platform *p, const layout_t *l, uint16_t start, uint16_t end) {
	pending_t pending[STDM_MAX_PENDING_TARGETS];
	uint8_t pending_count = 0;
	int16_t depth = 0; /* -1: right after an unconditional jump */
	uint16_t pc = start;
	uint16_t ret_address = (uint16_t)(end - 1);

	while (pc < end) {
		uint8_t op, operand_bytes = 0, pops = 0, pushes = 0;
		uint16_t length;
		int16_t current;

		if (pending_count > 0 && pending[0].address < pc) return STDM_ERR_JUMP;
		if (pending_count > 0 && pending[0].address == pc) {
			uint8_t k;
			if (depth >= 0 && depth != pending[0].depth) return STDM_ERR_STACK;
			depth = pending[0].depth;
			for (k = 1; k < pending_count; k++) pending[k - 1] = pending[k];
			pending_count--;
		} else if (depth < 0) {
			return STDM_ERR_JUMP;
		}
		current = depth;

		op = rb(p, (uint16_t)(l->code_start + pc));
		if (op == OP_TIMER) {
			operand_bytes = 4; pops = 2; pushes = 1;
		} else if (op == OP_COUNTER) {
			uint8_t kind;
			if ((uint16_t)(pc + 1) >= end) return STDM_ERR_OPERANDS;
			kind = rb(p, (uint16_t)(l->code_start + pc + 1));
			if (kind > 2) return STDM_ERR_BLOCK_OPERAND;
			operand_bytes = (uint8_t)(kind == 2 ? 6 : 4);
			pops = (uint8_t)(kind == 2 ? 5 : 3);
			pushes = 1;
		} else if (!opcode_shape(op, &operand_bytes, &pops, &pushes)) {
			return STDM_ERR_OPCODE;
		}
		length = (uint16_t)(1u + operand_bytes);
		if ((uint32_t)pc + length > end) return STDM_ERR_OPERANDS;

		if (op == OP_RET && pc != ret_address) return STDM_ERR_RET;
		if (pc == ret_address && op != OP_RET) return STDM_ERR_RET;

		{
			uint16_t operands = (uint16_t)(l->code_start + pc + 1);
			uint8_t a0 = operand_bytes > 0 ? rb(p, operands) : 0;
			uint8_t a1 = operand_bytes > 1 ? rb(p, (uint16_t)(operands + 1)) : 0;
			uint8_t cls;

			switch (op) {
			case OP_LOAD:
			case OP_STORE:
				if (a0 >= l->var_count) return STDM_ERR_VARIABLE;
				break;
			case OP_CALL:
				if (a0 >= l->routine_count) return STDM_ERR_ROUTINE_INDEX;
				if (current != 0) return STDM_ERR_STACK;
				break;
			case OP_CMP:
				if ((a0 & 0x07) > 5 || (a0 & 0xF0) != 0) return STDM_ERR_TYPE;
				break;
			case OP_ADD: case OP_SUB: case OP_MUL: case OP_DIV: case OP_NEG:
				if (a0 != T_INT && a0 != T_DINT && a0 != T_TIME && a0 != T_INTERNAL) return STDM_ERR_TYPE;
				break;
			case OP_CONV:
				if (a0 < T_INT || a0 > T_TIME) return STDM_ERR_TYPE;
				break;
			case OP_TIMER:
				if (a0 > 2) return STDM_ERR_BLOCK_OPERAND;
				if (a1 >= l->var_count || class_of(l, a1) != CLASS_BOOL) return STDM_ERR_BLOCK_OPERAND;
				{
					uint8_t elapsed = rb(p, (uint16_t)(operands + 2));
					uint8_t out = rb(p, (uint16_t)(operands + 3));
					if (elapsed >= l->var_count) return STDM_ERR_BLOCK_OPERAND;
					cls = class_of(l, elapsed);
					if (cls != CLASS_INT && cls != CLASS_INT32) return STDM_ERR_BLOCK_OPERAND;
					if (out >= l->var_count || class_of(l, out) != CLASS_BOOL) return STDM_ERR_BLOCK_OPERAND;
				}
				break;
			case OP_COUNTER: {
				uint8_t k;
				uint8_t count = operand_bytes;
				uint8_t current_var = rb(p, (uint16_t)(operands + 2));
				if (a1 >= l->var_count || class_of(l, a1) != CLASS_BOOL) return STDM_ERR_BLOCK_OPERAND;
				if (current_var >= l->var_count) return STDM_ERR_BLOCK_OPERAND;
				cls = class_of(l, current_var);
				if (cls != CLASS_INT && cls != CLASS_INT32) return STDM_ERR_BLOCK_OPERAND;
				for (k = 3; k < count; k++) {
					uint8_t v = rb(p, (uint16_t)(operands + k));
					if (v >= l->var_count || class_of(l, v) != CLASS_BOOL) return STDM_ERR_BLOCK_OPERAND;
				}
				break;
			}
			default:
				break;
			}

			if (op == OP_JMP || op == OP_JZ || op == OP_JNZ || op == OP_JZK || op == OP_JNZK) {
				uint16_t target = (uint16_t)((uint16_t)a0 | (uint16_t)((uint16_t)a1 << 8));
				int16_t after;
				uint8_t k, found = 0;
				if (current < pops) return STDM_ERR_STACK;
				after = (int16_t)(current - pops);
				if ((op == OP_JZK || op == OP_JNZK) && after < 1) return STDM_ERR_STACK;
				if (after > l->max_stack) return STDM_ERR_STACK;
				if (target <= pc || target > ret_address) return STDM_ERR_JUMP;
				for (k = 0; k < pending_count; k++) {
					if (pending[k].address == target) {
						if (pending[k].depth != after) return STDM_ERR_STACK;
						found = 1;
						break;
					}
				}
				if (!found) {
					uint8_t at = pending_count;
					if (pending_count >= STDM_MAX_PENDING_TARGETS) return STDM_ERR_JUMP;
					while (at > 0 && pending[at - 1].address > target) {
						pending[at] = pending[at - 1];
						at--;
					}
					pending[at].address = target;
					pending[at].depth = (uint8_t)after;
					pending_count++;
				}
				if (op == OP_JMP) depth = -1;
				else if (op == OP_JZK || op == OP_JNZK) depth = (int16_t)(after - 1);
				else depth = after;
			} else {
				if (current < pops) return STDM_ERR_STACK;
				current = (int16_t)(current - pops + pushes);
				if (current > l->max_stack) return STDM_ERR_STACK;
				if (op == OP_RET) {
					if (current != 0 || pending_count != 0) return STDM_ERR_RET;
					depth = -1;
				} else {
					depth = current;
				}
			}
		}
		pc = (uint16_t)(pc + length);
	}
	return STDM_OK;
}

stdm_status stdm_vm_verify(const stdm_platform *p, uint16_t capacity) {
	layout_t l;
	uint32_t total;
	uint16_t crc = 0xFFFFu, addr, i;
	uint32_t seen_pins = 0;

	if (capacity < STDM_HEADER_SIZE) return STDM_ERR_TOO_SHORT;
	if (rb(p, 0) != 'S' || rb(p, 1) != 'T' || rb(p, 2) != 'D' || rb(p, 3) != 'M') return STDM_ERR_MAGIC;
	if (rb(p, 4) != STDM_FORMAT_VERSION) return STDM_ERR_VERSION;
	if (rb(p, 5) != 0) return STDM_ERR_RESERVED;
	read_layout(p, &l);
	total = (uint32_t)l.code_start + l.code_size;
	if (total > capacity) return STDM_ERR_CAPACITY;

	for (addr = 0; addr < total; addr++) {
		if (addr == 20 || addr == 21) continue;
		crc = crc16_update(crc, rb(p, addr));
	}
	if (crc != ru16(p, 20)) return STDM_ERR_CRC;

	if (l.var_count > STDM_MAX_INDEXED || l.routine_count > STDM_MAX_INDEXED) return STDM_ERR_COUNTS;
	if (l.scan_count > l.routine_count) return STDM_ERR_COUNTS;
	if (l.sys_count > STDM_SYSTEM_VARIABLE_COUNT) return STDM_ERR_COUNTS;

	for (i = 0; i < l.io_count; i++) {
		uint16_t entry = (uint16_t)(l.io_start + 3u * i);
		uint8_t index = rb(p, entry);
		uint8_t flags = rb(p, (uint16_t)(entry + 1));
		uint8_t role = (uint8_t)(flags & 0x07);
		uint8_t pin = rb(p, (uint16_t)(entry + 2));
		uint8_t digital_input = (uint8_t)(role == STDM_ROLE_DIGITAL_INPUT || role == STDM_ROLE_DIGITAL_INPUT_PULLUP);
		uint8_t digital = (uint8_t)(digital_input || role == STDM_ROLE_DIGITAL_OUTPUT);
		if (index >= l.var_count || role > STDM_ROLE_PWM_OUTPUT) return STDM_ERR_IO_TABLE;
		if ((flags & 0xF0) != 0 || ((flags & 0x08) != 0 && !digital_input)) return STDM_ERR_IO_TABLE;
		if ((class_of(&l, index) == CLASS_BOOL) != (digital != 0)) return STDM_ERR_IO_TABLE;
		if (pin < 2 || pin > 19 || (seen_pins & ((uint32_t)1 << pin)) != 0) return STDM_ERR_IO_TABLE;
		seen_pins |= (uint32_t)1 << pin;
	}
	for (i = 0; i < l.sys_count; i++) {
		uint16_t entry = (uint16_t)(l.sys_start + 2u * i);
		if (rb(p, entry) >= l.bool_count) return STDM_ERR_SYS_TABLE;
		if (rb(p, (uint16_t)(entry + 1)) >= STDM_SYSTEM_VARIABLE_COUNT) return STDM_ERR_SYS_TABLE;
	}

	if (l.routine_count == 0 && l.code_size != 0) return STDM_ERR_ROUTINE_TABLE;
	for (i = 0; i < l.routine_count; i++) {
		uint16_t offset = routine_offset(p, &l, (uint8_t)i);
		if (i == 0 && offset != 0) return STDM_ERR_ROUTINE_TABLE;
		if (offset >= l.code_size) return STDM_ERR_ROUTINE_TABLE;
		if (i > 0 && offset <= routine_offset(p, &l, (uint8_t)(i - 1))) return STDM_ERR_ROUTINE_TABLE;
	}
	for (i = 0; i < l.routine_count; i++) {
		uint16_t start = routine_offset(p, &l, (uint8_t)i);
		uint16_t end = (i + 1 < l.routine_count) ? routine_offset(p, &l, (uint8_t)(i + 1)) : l.code_size;
		stdm_status status = verify_routine(p, &l, start, end);
		if (status != STDM_OK) return status;
	}
	return STDM_OK;
}

/* ------------------------------------------------------------------ variables */

static int32_t sx16(uint16_t value) {
	return value >= 0x8000u ? (int32_t)value - 65536 : (int32_t)value;
}

static layout_t vm_layout(const stdm_vm *vm) {
	layout_t l;
	l.bool_count = vm->bool_count;
	l.int_count = vm->int_count;
	l.word_count = vm->word_count;
	l.int32_count = vm->int32_count;
	l.var_count = (uint16_t)(vm->bool_count + vm->int_count + vm->word_count + vm->int32_count);
	return l;
}

/* Cell value of a variable: sign extension for INT, zero extension for WORD, bit pattern for 4 bytes. */
static uint32_t variable_load(const stdm_vm *vm, uint8_t index) {
	layout_t l = vm_layout(vm);
	const uint8_t *at = &vm->memory[variable_offset(&l, index)];
	switch (class_of(&l, index)) {
	case CLASS_BOOL: return at[0];
	case CLASS_INT: return (uint32_t)sx16((uint16_t)((uint16_t)at[0] | (uint16_t)((uint16_t)at[1] << 8)));
	case CLASS_WORD: return (uint32_t)((uint16_t)at[0] | (uint16_t)((uint16_t)at[1] << 8));
	default:
		return (uint32_t)at[0] | ((uint32_t)at[1] << 8) | ((uint32_t)at[2] << 16) | ((uint32_t)at[3] << 24);
	}
}

/* Writes a cell value truncated to the storage class of the variable, forced or not. */
static void variable_write(stdm_vm *vm, uint8_t index, uint32_t value) {
	layout_t l = vm_layout(vm);
	uint8_t *at = &vm->memory[variable_offset(&l, index)];
	switch (class_of(&l, index)) {
	case CLASS_BOOL: at[0] = (uint8_t)(value != 0); break;
	case CLASS_INT:
	case CLASS_WORD:
		at[0] = (uint8_t)(value & 0xFFu);
		at[1] = (uint8_t)((value >> 8) & 0xFFu);
		break;
	default:
		at[0] = (uint8_t)(value & 0xFFu);
		at[1] = (uint8_t)((value >> 8) & 0xFFu);
		at[2] = (uint8_t)((value >> 16) & 0xFFu);
		at[3] = (uint8_t)((value >> 24) & 0xFFu);
	}
}

static uint8_t is_forced(const stdm_vm *vm, uint8_t index) {
	return (uint8_t)((vm->forced[index >> 3] >> (index & 7)) & 1u);
}

/* The write of the program: ignored on a forced variable. */
static void variable_store(stdm_vm *vm, uint8_t index, uint32_t value) {
	if (is_forced(vm, index)) return;
	variable_write(vm, index, value);
}

uint8_t stdm_vm_fault(const stdm_vm *vm) { return vm->fault; }

uint16_t stdm_vm_cycle_count(const stdm_vm *vm) { return vm->cycle_count; }

const uint8_t *stdm_vm_memory(const stdm_vm *vm) { return vm->memory; }

uint16_t stdm_vm_memory_size(const stdm_vm *vm) {
	return (uint16_t)(vm->bool_count + 2u * (uint16_t)(vm->int_count + vm->word_count) +
		4u * vm->int32_count);
}

uint8_t stdm_vm_variable_count(const stdm_vm *vm) {
	return (uint8_t)(vm->bool_count + vm->int_count + vm->word_count + vm->int32_count);
}

int32_t stdm_vm_get_variable(const stdm_vm *vm, uint8_t index) { return (int32_t)variable_load(vm, index); }

void stdm_vm_set_variable(stdm_vm *vm, uint8_t index, int32_t value) {
	variable_write(vm, index, (uint32_t)value);
}

uint8_t stdm_vm_force(stdm_vm *vm, uint8_t index, int32_t value) {
	if (index >= stdm_vm_variable_count(vm)) return 0;
	variable_write(vm, index, (uint32_t)value);
	vm->forced[index >> 3] = (uint8_t)(vm->forced[index >> 3] | (1u << (index & 7)));
	return 1;
}

uint8_t stdm_vm_release(stdm_vm *vm, uint8_t index) {
	if (index >= stdm_vm_variable_count(vm)) return 0;
	vm->forced[index >> 3] = (uint8_t)(vm->forced[index >> 3] & ~(1u << (index & 7)));
	return 1;
}

void stdm_vm_release_all(stdm_vm *vm) {
	uint8_t i;
	for (i = 0; i < sizeof vm->forced; i++) vm->forced[i] = 0;
}

/* ------------------------------------------------------------------ execution */

static uint32_t fold(uint8_t type, uint32_t x) {
	if (type == T_INT) return (uint32_t)sx16((uint16_t)(x & 0xFFFFu));
	if (type == T_WORD) return x & 0xFFFFu;
	return x;
}

static uint32_t cmp_result(uint8_t flags, uint32_t a, uint32_t b) {
	uint8_t unsigned_compare = (uint8_t)((flags & 0x08) != 0);
	int32_t sa = (int32_t)a, sb = (int32_t)b;
	switch (flags & 0x07) {
	case 0: return a == b;
	case 1: return a != b;
	case 2: return unsigned_compare ? a < b : sa < sb;
	case 3: return unsigned_compare ? a <= b : sa <= sb;
	case 4: return unsigned_compare ? a > b : sa > sb;
	default: return unsigned_compare ? a >= b : sa >= sb;
	}
}

static uint8_t code_at(const stdm_vm *vm, uint16_t pc) {
	return vm->platform->read_byte(vm->platform->ctx, (uint16_t)(vm->code_start + pc));
}

static uint16_t routine_start(const stdm_vm *vm, uint8_t r) {
	return ru16(vm->platform, (uint16_t)(vm->routines_start + 2u * r));
}

static uint32_t execute_timer(stdm_vm *vm, uint16_t pc, uint32_t input, uint32_t preset, uint32_t dt) {
	uint8_t kind = code_at(vm, (uint16_t)(pc + 1));
	uint8_t last_var = code_at(vm, (uint16_t)(pc + 2));
	uint8_t elapsed_var = code_at(vm, (uint16_t)(pc + 3));
	uint8_t out_var = code_at(vm, (uint16_t)(pc + 4));
	uint32_t last = variable_load(vm, last_var);
	uint32_t in = input != 0;
	int32_t elapsed = (int32_t)variable_load(vm, elapsed_var);
	int32_t pt = (int32_t)preset;
	uint32_t rising = in && !last;
	uint32_t falling = !in && last;
	uint32_t out = 0;

	if (kind == 0) { /* TON */
		if (rising) {
			out = 0;
		} else if (in) {
			if (elapsed >= pt) {
				out = 1;
			} else {
				out = 0;
				variable_store(vm, elapsed_var, (uint32_t)elapsed + dt);
			}
		} else {
			variable_store(vm, elapsed_var, 0);
			out = 0;
		}
	} else if (kind == 1) { /* TOF */
		if (in) {
			variable_store(vm, elapsed_var, 0);
			out = 1;
		} else if (falling) {
			out = 1;
		} else if (variable_load(vm, out_var) != 0 && elapsed < pt) {
			out = 1;
			variable_store(vm, elapsed_var, (uint32_t)elapsed + dt);
		} else {
			out = 0;
		}
	} else { /* TP */
		uint32_t running = variable_load(vm, out_var);
		if (!running && rising) {
			variable_store(vm, elapsed_var, 0);
			out = 1;
		} else if (running && elapsed < pt) {
			out = 1;
			variable_store(vm, elapsed_var, (uint32_t)elapsed + dt);
		} else {
			out = 0;
			if (!in) variable_store(vm, elapsed_var, 0);
		}
	}
	variable_store(vm, out_var, out);
	variable_store(vm, last_var, in);
	return out;
}

/*
 * Counter operands, popped in reverse order of evaluation: CU/CD, R/LD, PV, then (CTUD) CD, LD.
 * `inputs` holds them in push order.
 */
static uint32_t execute_counter(stdm_vm *vm, uint16_t pc, const uint32_t *inputs) {
	uint8_t kind = code_at(vm, (uint16_t)(pc + 1));
	uint8_t last_var = code_at(vm, (uint16_t)(pc + 2));
	uint8_t current_var = code_at(vm, (uint16_t)(pc + 3));
	uint8_t out_var = code_at(vm, (uint16_t)(pc + 4));
	uint32_t input = inputs[0] != 0;
	uint32_t control = inputs[1] != 0;
	int32_t preset = (int32_t)inputs[2];
	uint32_t last = variable_load(vm, last_var);
	uint32_t rising = input && !last;
	uint32_t next = variable_load(vm, current_var);
	int32_t stored;
	uint32_t out;

	if (kind == 2) {
		uint32_t down_input = inputs[3] != 0;
		uint32_t load = inputs[4] != 0;
		uint8_t down_last_var = code_at(vm, (uint16_t)(pc + 5));
		uint8_t down_out_var = code_at(vm, (uint16_t)(pc + 6));
		uint32_t down_last = variable_load(vm, down_last_var);
		if (control) next = 0;
		else if (load) next = (uint32_t)preset;
		else {
			if (rising) next = next + 1u;
			if (down_input && !down_last) next = next - 1u;
		}
		variable_store(vm, last_var, input);
		variable_store(vm, current_var, next);
		stored = (int32_t)variable_load(vm, current_var);
		out = stored >= preset;
		variable_store(vm, out_var, out);
		variable_store(vm, down_last_var, down_input);
		variable_store(vm, down_out_var, stored <= 0);
		return out;
	}
	if (control) next = kind == 0 ? 0u : (uint32_t)preset;
	else if (rising) next = kind == 0 ? next + 1u : next - 1u;
	variable_store(vm, last_var, input);
	variable_store(vm, current_var, next);
	stored = (int32_t)variable_load(vm, current_var);
	out = kind == 1 ? (stored <= 0) : (stored >= preset);
	variable_store(vm, out_var, out);
	return out;
}

static void run_routine(stdm_vm *vm, uint8_t routine, uint32_t dt) {
	uint16_t pc = routine_start(vm, routine);
	uint8_t sp = 0;
	uint8_t call_depth = 0;
	uint32_t *stack = vm->stack;

	for (;;) {
		uint8_t op = code_at(vm, pc);
		STDM_COUNT_OP();
		switch (op) {
		case OP_PUSH0: stack[sp++] = 0; pc++; break;
		case OP_PUSH1: stack[sp++] = 1; pc++; break;
		case OP_PUSH8: {
			uint8_t b = code_at(vm, (uint16_t)(pc + 1));
			stack[sp++] = (uint32_t)(b >= 0x80u ? (int32_t)b - 256 : (int32_t)b);
			pc += 2;
			break;
		}
		case OP_PUSH16: {
			uint16_t v = (uint16_t)((uint16_t)code_at(vm, (uint16_t)(pc + 1)) |
				(uint16_t)((uint16_t)code_at(vm, (uint16_t)(pc + 2)) << 8));
			stack[sp++] = (uint32_t)sx16(v);
			pc += 3;
			break;
		}
		case OP_PUSH32: {
			uint32_t v = (uint32_t)code_at(vm, (uint16_t)(pc + 1)) |
				((uint32_t)code_at(vm, (uint16_t)(pc + 2)) << 8) |
				((uint32_t)code_at(vm, (uint16_t)(pc + 3)) << 16) |
				((uint32_t)code_at(vm, (uint16_t)(pc + 4)) << 24);
			stack[sp++] = v;
			pc += 5;
			break;
		}
		case OP_LOAD: stack[sp++] = variable_load(vm, code_at(vm, (uint16_t)(pc + 1))); pc += 2; break;
		case OP_STORE: variable_store(vm, code_at(vm, (uint16_t)(pc + 1)), stack[--sp]); pc += 2; break;
		case OP_POP: sp--; pc++; break;
		case OP_ADD: case OP_SUB: case OP_MUL: {
			uint8_t type = code_at(vm, (uint16_t)(pc + 1));
			uint32_t b = stack[--sp], a = stack[--sp];
			uint32_t r = op == OP_ADD ? a + b : op == OP_SUB ? a - b : a * b;
			stack[sp++] = fold(type, r);
			pc += 2;
			break;
		}
		case OP_DIV: {
			uint8_t type = code_at(vm, (uint16_t)(pc + 1));
			int32_t b = (int32_t)stack[--sp], a = (int32_t)stack[--sp];
			int32_t r;
			if (b == 0) {
				vm->fault = STDM_FAULT_DIVISION_BY_ZERO;
				return;
			}
			r = (a == (int32_t)0x80000000u && b == -1) ? a : a / b;
			stack[sp++] = fold(type, (uint32_t)r);
			pc += 2;
			break;
		}
		case OP_NEG: {
			uint8_t type = code_at(vm, (uint16_t)(pc + 1));
			uint32_t a = stack[--sp];
			stack[sp++] = fold(type, 0u - a);
			pc += 2;
			break;
		}
		case OP_CONV: {
			uint8_t type = code_at(vm, (uint16_t)(pc + 1));
			stack[sp - 1] = fold(type, stack[sp - 1]);
			pc += 2;
			break;
		}
		case OP_CMP: {
			uint8_t flags = code_at(vm, (uint16_t)(pc + 1));
			uint32_t b = stack[--sp], a = stack[--sp];
			stack[sp++] = cmp_result(flags, a, b);
			pc += 2;
			break;
		}
		case OP_NOT: stack[sp - 1] = stack[sp - 1] == 0; pc++; break;
		case OP_JMP: pc = (uint16_t)((uint16_t)code_at(vm, (uint16_t)(pc + 1)) | (uint16_t)((uint16_t)code_at(vm, (uint16_t)(pc + 2)) << 8)); break;
		case OP_JZ: case OP_JNZ: {
			uint32_t v = stack[--sp];
			uint8_t jump = (uint8_t)(op == OP_JZ ? v == 0 : v != 0);
			pc = jump ? (uint16_t)((uint16_t)code_at(vm, (uint16_t)(pc + 1)) | (uint16_t)((uint16_t)code_at(vm, (uint16_t)(pc + 2)) << 8)) : (uint16_t)(pc + 3);
			break;
		}
		case OP_JZK: case OP_JNZK: {
			uint32_t v = stack[sp - 1];
			uint8_t jump = (uint8_t)(op == OP_JZK ? v == 0 : v != 0);
			if (jump) {
				pc = (uint16_t)((uint16_t)code_at(vm, (uint16_t)(pc + 1)) | (uint16_t)((uint16_t)code_at(vm, (uint16_t)(pc + 2)) << 8));
			} else {
				sp--;
				pc += 3;
			}
			break;
		}
		case OP_CALL: {
			uint8_t target = code_at(vm, (uint16_t)(pc + 1));
			if (call_depth >= vm->max_call_depth) {
				vm->fault = STDM_FAULT_CALL_DEPTH;
				return;
			}
			vm->call_stack[call_depth++] = (uint16_t)(pc + 2);
			pc = routine_start(vm, target);
			break;
		}
		case OP_RET:
			if (call_depth == 0) return;
			pc = vm->call_stack[--call_depth];
			break;
		case OP_TIMER: {
			uint32_t preset = stack[--sp], input = stack[--sp];
			stack[sp++] = execute_timer(vm, pc, input, preset, dt);
			pc += 5;
			break;
		}
		case OP_COUNTER: {
			uint8_t kind = code_at(vm, (uint16_t)(pc + 1));
			uint8_t count = (uint8_t)(kind == 2 ? 5 : 3);
			uint32_t inputs[5];
			uint8_t i;
			for (i = count; i > 0; i--) inputs[i - 1] = stack[--sp];
			stack[sp++] = execute_counter(vm, pc, inputs);
			pc = (uint16_t)(pc + 1 + (kind == 2 ? 6 : 4));
			break;
		}
		default:
			vm->fault = STDM_FAULT_INVALID_IMAGE; /* unreachable on a verified image */
			return;
		}
	}
}

/* ------------------------------------------------------------------ cycle */

static void write_outputs(stdm_vm *vm, uint8_t all_low) {
	uint8_t i;
	for (i = 0; i < vm->io_count; i++) {
		uint16_t entry = (uint16_t)(vm->io_start + 3u * i);
		uint8_t index = vm->platform->read_byte(vm->platform->ctx, entry);
		uint8_t role = (uint8_t)(vm->platform->read_byte(vm->platform->ctx, (uint16_t)(entry + 1)) & 0x07);
		uint8_t pin = vm->platform->read_byte(vm->platform->ctx, (uint16_t)(entry + 2));
		if (role == STDM_ROLE_DIGITAL_OUTPUT) {
			vm->platform->write_digital(vm->platform->ctx, pin, (uint8_t)(!all_low && variable_load(vm, index) != 0));
		} else if (role == STDM_ROLE_PWM_OUTPUT) {
			int32_t value = all_low ? 0 : (int32_t)variable_load(vm, index);
			vm->platform->write_pwm(vm->platform->ctx, pin, (uint8_t)(value < 0 ? 0 : value > 255 ? 255 : value));
		}
	}
}

static void read_inputs(stdm_vm *vm) {
	uint8_t i;
	for (i = 0; i < vm->io_count; i++) {
		uint16_t entry = (uint16_t)(vm->io_start + 3u * i);
		uint8_t index = vm->platform->read_byte(vm->platform->ctx, entry);
		uint8_t flags = vm->platform->read_byte(vm->platform->ctx, (uint16_t)(entry + 1));
		uint8_t role = (uint8_t)(flags & 0x07);
		uint8_t pin = vm->platform->read_byte(vm->platform->ctx, (uint16_t)(entry + 2));
		if (role == STDM_ROLE_DIGITAL_INPUT || role == STDM_ROLE_DIGITAL_INPUT_PULLUP) {
			uint8_t level = vm->platform->read_digital(vm->platform->ctx, pin) != 0;
			variable_store(vm, index, (flags & 0x08) ? !level : level);
		} else if (role == STDM_ROLE_ANALOG_INPUT) {
			variable_store(vm, index, vm->platform->read_analog(vm->platform->ctx, pin));
		}
	}
}

static void update_system_variables(stdm_vm *vm, uint32_t dt) {
	uint8_t i;
	for (i = 0; i < vm->sys_count; i++) {
		uint16_t entry = (uint16_t)(vm->sys_start + 2u * i);
		uint8_t index = vm->platform->read_byte(vm->platform->ctx, entry);
		uint8_t id = vm->platform->read_byte(vm->platform->ctx, (uint16_t)(entry + 1));
		if (id == 0) {
			variable_store(vm, index, vm->first_cycle);
		} else {
			uint32_t period = TIME_BASE_PERIOD_MS[id];
			uint32_t phase = ((uint32_t)vm->sys_phase[id] + dt) % period;
			vm->sys_phase[id] = (uint16_t)phase;
			variable_store(vm, index, 2u * phase < period);
		}
	}
}

static void run_cycle(stdm_vm *vm, uint32_t dt) {
	uint8_t r;
	read_inputs(vm);
	update_system_variables(vm, dt);
	vm->first_cycle = 0;
	vm->cycle_count++;
	for (r = 0; r < vm->scan_count && vm->fault == STDM_FAULT_NONE; r++) run_routine(vm, r, dt);
	write_outputs(vm, vm->fault != STDM_FAULT_NONE);
}

uint8_t stdm_vm_poll(stdm_vm *vm) {
	uint32_t now, elapsed, k, dt;
	if (vm->fault != STDM_FAULT_NONE) return 0;
	now = vm->platform->millis(vm->platform->ctx);
	if (vm->first_cycle) {
		vm->last_tick = now;
		run_cycle(vm, 0);
		return 1;
	}
	elapsed = now - vm->last_tick;
	if (elapsed < vm->cycle_period_ms) return 0;
	k = elapsed / vm->cycle_period_ms;
	dt = k * vm->cycle_period_ms;
	vm->last_tick += dt;
	run_cycle(vm, dt);
	return 1;
}

stdm_status stdm_vm_start(stdm_vm *vm, const stdm_platform *platform, uint16_t capacity) {
	layout_t l;
	uint16_t memory_needed, cell;
	uint8_t i;
	stdm_status status = stdm_vm_verify(platform, capacity);
	if (status != STDM_OK) return status;

	read_layout(platform, &l);
	memory_needed = (uint16_t)(l.bool_count + 2u * (uint16_t)(l.int_count + l.word_count) + 4u * l.int32_count);
	if (memory_needed > STDM_VM_MEM_BYTES || l.max_stack > STDM_VM_MAX_STACK ||
		l.max_call_depth > STDM_VM_MAX_CALL_DEPTH) {
		return STDM_ERR_RAM;
	}

	vm->platform = platform;
	vm->cycle_period_ms = l.cycle_period_ms;
	vm->bool_count = l.bool_count;
	vm->int_count = l.int_count;
	vm->word_count = l.word_count;
	vm->int32_count = l.int32_count;
	vm->io_count = l.io_count;
	vm->sys_count = l.sys_count;
	vm->routine_count = l.routine_count;
	vm->scan_count = l.scan_count;
	vm->max_call_depth = l.max_call_depth;
	vm->io_start = l.io_start;
	vm->sys_start = l.sys_start;
	vm->routines_start = l.routines_start;
	vm->code_start = l.code_start;
	vm->code_size = l.code_size;
	vm->fault = STDM_FAULT_NONE;
	vm->first_cycle = 1;
	vm->cycle_count = 0;
	stdm_vm_release_all(vm);
	vm->last_tick = 0;
	for (i = 0; i < STDM_SYSTEM_VARIABLE_COUNT; i++) vm->sys_phase[i] = 0;
	for (cell = 0; cell < STDM_VM_MEM_BYTES; cell++) vm->memory[cell] = 0;

	for (i = 0; i < l.io_count; i++) {
		uint16_t entry = (uint16_t)(l.io_start + 3u * i);
		platform->configure_pin(platform->ctx, rb(platform, (uint16_t)(entry + 2)),
			(uint8_t)(rb(platform, (uint16_t)(entry + 1)) & 0x07));
	}
	write_outputs(vm, 1);
	return STDM_OK;
}
