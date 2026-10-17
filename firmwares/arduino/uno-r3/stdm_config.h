// Capacities of the bytecode VM on the ATmega328P (2 KB of RAM). Keep them equal to `limits.vm` of
// the Arduino Uno R3 descriptor (src/hardware/arduino/uno-r3.descriptor.ts).
#ifndef STDM_CONFIG_H
#define STDM_CONFIG_H

#define STDM_VM_MEM_BYTES 512
#define STDM_VM_MAX_STACK 16
#define STDM_VM_MAX_CALL_DEPTH 4

#endif
