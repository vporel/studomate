/*
 * Native test driver for the Studomate VM: runs a bytecode image under a virtual clock and
 * simulated pins, driven by commands on stdin.
 *
 *   stdm_run <image.bin>            run commands from stdin
 *   stdm_run <image.bin> verify     print the verification status and exit
 *   stdm_run --verify-hex           read one hex image per line on stdin, print each status
 *
 * Commands (one per line):
 *   cycle [n]         run n cycles (default 1): the first one right at start, then one per period
 *   advance <ms>      move the virtual clock forward
 *   poll              run a cycle if one is due, as the board's main loop does
 *   set <idx> <v>     write a variable (bypasses the pins)
 *   pin <n> <v>       set the level (digital) or value (analog) read on pin n
 *   mem               print the variable memory
 *   ops               print the opcodes executed since the last `ops` and reset the count
 *
 * Each cycle prints `<fault> | <variables...> | <pin>=<value>...` (outputs the image drives).
 */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "stdm_vm.h"

#define MAX_IMAGE 4096
#define PIN_COUNT 20

typedef struct {
	uint8_t image[MAX_IMAGE];
	uint32_t now;
	uint16_t digital_in[PIN_COUNT];
	uint16_t analog_in[PIN_COUNT];
	int16_t output_value[PIN_COUNT]; /* -1: pin is not an output of the image */
} sim_t;

static uint8_t sim_read_byte(void *ctx, uint16_t addr) {
	sim_t *sim = (sim_t *)ctx;
	return addr < MAX_IMAGE ? sim->image[addr] : 0;
}
static uint32_t sim_millis(void *ctx) { return ((sim_t *)ctx)->now; }
static void sim_configure(void *ctx, uint8_t pin, uint8_t role) {
	sim_t *sim = (sim_t *)ctx;
	if (pin < PIN_COUNT) sim->output_value[pin] = (role == STDM_ROLE_DIGITAL_OUTPUT || role == STDM_ROLE_PWM_OUTPUT) ? 0 : -1;
}
static uint8_t sim_read_digital(void *ctx, uint8_t pin) { return pin < PIN_COUNT ? (uint8_t)(((sim_t *)ctx)->digital_in[pin] != 0) : 0; }
static uint16_t sim_read_analog(void *ctx, uint8_t pin) { return pin < PIN_COUNT ? ((sim_t *)ctx)->analog_in[pin] : 0; }
static void sim_write_digital(void *ctx, uint8_t pin, uint8_t level) { if (pin < PIN_COUNT) ((sim_t *)ctx)->output_value[pin] = level; }
static void sim_write_pwm(void *ctx, uint8_t pin, uint8_t value) { if (pin < PIN_COUNT) ((sim_t *)ctx)->output_value[pin] = value; }

static void print_state(const stdm_vm *vm, const sim_t *sim) {
	int pin;
	unsigned i;
	printf("%u |", (unsigned)stdm_vm_fault(vm));
	for (i = 0; i < stdm_vm_variable_count(vm); i++) printf(" %ld", (long)stdm_vm_get_variable(vm, (uint8_t)i));
	printf(" |");
	for (pin = 0; pin < PIN_COUNT; pin++) {
		if (sim->output_value[pin] >= 0) printf(" %d=%d", pin, sim->output_value[pin]);
	}
	printf("\n");
}

uint32_t stdm_executed_ops;
static sim_t sim;
static stdm_vm vm;

static int hex_value(int c) {
	if (c >= '0' && c <= '9') return c - '0';
	if (c >= 'a' && c <= 'f') return c - 'a' + 10;
	if (c >= 'A' && c <= 'F') return c - 'A' + 10;
	return -1;
}

static void fill_platform(stdm_platform *platform) {
	platform->ctx = &sim;
	platform->read_byte = sim_read_byte;
	platform->millis = sim_millis;
	platform->configure_pin = sim_configure;
	platform->read_digital = sim_read_digital;
	platform->read_analog = sim_read_analog;
	platform->write_digital = sim_write_digital;
	platform->write_pwm = sim_write_pwm;
}

static int verify_hex_lines(void) {
	static char text[2 * MAX_IMAGE + 8];
	stdm_platform platform;
	fill_platform(&platform);
	while (fgets(text, sizeof text, stdin)) {
		size_t length = 0, i;
		memset(sim.image, 0, sizeof sim.image);
		for (i = 0; text[i] && hex_value(text[i]) >= 0 && hex_value(text[i + 1]) >= 0; i += 2) {
			sim.image[length++] = (uint8_t)(hex_value(text[i]) * 16 + hex_value(text[i + 1]));
		}
		printf("%d\n", (int)stdm_vm_verify(&platform, (uint16_t)length));
	}
	return 0;
}

int main(int argc, char **argv) {
	FILE *file;
	size_t size;
	stdm_platform platform;
	char line[128];
	int started_cycles = 0;
	int pin;

	if (argc >= 2 && strcmp(argv[1], "--verify-hex") == 0) return verify_hex_lines();
	if (argc < 2) {
		fprintf(stderr, "usage: stdm_run <image.bin> [verify]\n");
		return 2;
	}
	file = fopen(argv[1], "rb");
	if (!file) {
		fprintf(stderr, "cannot open %s\n", argv[1]);
		return 2;
	}
	size = fread(sim.image, 1, MAX_IMAGE, file);
	fclose(file);

	for (pin = 0; pin < PIN_COUNT; pin++) sim.output_value[pin] = -1;
	sim.now = 1000;
	fill_platform(&platform);

	if (argc > 2 && strcmp(argv[2], "verify") == 0) {
		printf("%d\n", (int)stdm_vm_verify(&platform, (uint16_t)size));
		return 0;
	}
	{
		stdm_status status = stdm_vm_start(&vm, &platform, (uint16_t)size);
		if (status != STDM_OK) {
			printf("ERR %d\n", (int)status);
			return 1;
		}
	}

	while (fgets(line, sizeof line, stdin)) {
		char command[16];
		long a = 0, b = 0;
		int fields = sscanf(line, "%15s %ld %ld", command, &a, &b);
		if (fields < 1) continue;
		if (strcmp(command, "cycle") == 0) {
			long count = fields >= 2 ? a : 1, i;
			for (i = 0; i < count; i++) {
				if (started_cycles > 0) sim.now += vm.cycle_period_ms;
				stdm_vm_poll(&vm);
				started_cycles++;
				print_state(&vm, &sim);
			}
		} else if (strcmp(command, "advance") == 0) {
			sim.now += (uint32_t)a;
		} else if (strcmp(command, "poll") == 0) {
			uint8_t ran = stdm_vm_poll(&vm);
			if (ran) started_cycles++;
			printf("%s ", ran ? "ran" : "idle");
			print_state(&vm, &sim);
		} else if (strcmp(command, "set") == 0) {
			stdm_vm_set_variable(&vm, (uint8_t)a, (int32_t)b);
		} else if (strcmp(command, "pin") == 0) {
			if (a >= 0 && a < PIN_COUNT) {
				sim.digital_in[a] = (uint16_t)b;
				sim.analog_in[a] = (uint16_t)b;
			}
		} else if (strcmp(command, "ops") == 0) {
			printf("ops %lu\n", (unsigned long)stdm_executed_ops);
			stdm_executed_ops = 0;
		} else if (strcmp(command, "mem") == 0) {
			print_state(&vm, &sim);
		}
		fflush(stdout);
	}
	return 0;
}
