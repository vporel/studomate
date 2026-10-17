// Studomate firmware (Arduino Uno R3): remote I/O server and bytecode VM.
//
// Serves the pins of the board to Studomate over the serial link, or runs a stored program. Frames are ASCII lines
// `COMMAND args*CC\n`, CC being the CRC-8 (poly 0x07) of everything before `*`.
//
//   host  -> PING                      board -> PONG STUDOMATE_REMOTE_IO <protocol> <firmware> <period>
//   host  -> CFG 2:IP 13:O A0:A        board -> CFG_OK | ERR <PIN|MODE|FORMAT>
//   host  -> OUT 13=1 9=128            (full image of the outputs, doubles as the watchdog heartbeat)
//   board -> IN 2=1 A0=512             (full image of the inputs, every INPUT_PERIOD_MS)
//
//   host  -> STATUS                    board -> STATUS <state> <fault> <imageId>
//   host  -> PROG_BEGIN <size> <id>    board -> PROG_READY | ERR <PROG_SIZE|PROG_FORMAT>
//   host  -> PROG_CHUNK <seq> <hex>    board -> PROG_ACK <seq> | ERR <PROG_STATE|PROG_SEQ|PROG_FORMAT>
//   host  -> PROG_END                  board -> PROG_OK <imageId> | ERR <PROG_STATE|PROG_INVALID|PROG_RAM>
//   host  -> PROG_RUN                  board -> PROG_OK <imageId> | ERR <PROG_INVALID|PROG_RAM>
//   host  -> PROG_STOP                 board -> PROG_STOPPED
//   host  -> WATCH 1|0                 board -> WATCH_OK | ERR WATCH_STATE (not running)
//   host  -> SET <idx> <value>         board -> SET_OK | ERR FORCE_STATE | ERR FORCE_INDEX
//   host  -> FORCE <idx> <value>       board -> FORCE_OK | ERR FORCE_STATE | ERR FORCE_INDEX
//   host  -> UNFORCE <idx>|ALL         board -> FORCE_OK | ERR FORCE_STATE | ERR FORCE_INDEX
//                                      (a forced variable keeps its value whatever the program writes;
//                                       values are signed 32-bit decimals, variables are indexed as in the image)
//   board -> TEL <tag> <cycle> <offset> <hex>   (variable memory of the running program, every
//                                                TELEMETRY_PERIOD_MS, 16 bytes per frame)
//
// Modes: I input, IP input with pull-up, O output, P PWM output, A analog input.
// Without a valid OUT frame for WATCHDOG_TIMEOUT ms, every output falls back to 0.
//
// A program image (bytecode, spec in BYTECODE-SPEC.md) lives at the start of
// the EEPROM. At boot a valid image starts the VM; a CFG frame hands the pins back to the host
// (remote I/O) until the next reset. PROG_RUN starts the stored program, PROG_STOP halts it and
// releases the pins without serving remote I/O. STATUS reports `state` 0 remote I/O, 1 running,
// 2 fault, 3 stopped,
// the fault code (1 division by zero, 2 call depth, 3 watchdog, 4 invalid image) and the
// identifier of the image in the EEPROM (00000000 when none is valid).

#include <EEPROM.h>
#include <avr/interrupt.h>
#include <avr/wdt.h>

#include "stdm_vm.h"

#define PROTOCOL_VERSION "1.0"
#define FIRMWARE_VERSION "1.0.0"
#define INPUT_PERIOD_MS 20
#define WATCHDOG_TIMEOUT 500
#define MAX_FRAME_LENGTH 128
#define DEBOUNCE_MS 5
#define ANALOG_SAMPLES 4

// Pin index: digital pins 2..13 keep their number, A0..A5 are 14..19 (as in Arduino's A0..A5).
const uint8_t FIRST_PIN = 2;
const uint8_t PIN_COUNT = 20;
const uint8_t FIRST_ANALOG = 14;

enum Mode : uint8_t { UNUSED, IN, IN_PULLUP, OUT_DIGITAL, OUT_PWM, IN_ANALOG };

Mode modes[PIN_COUNT];
bool debouncedState[PIN_COUNT];
bool lastRaw[PIN_COUNT];
unsigned long lastRawChange[PIN_COUNT];

char line[MAX_FRAME_LENGTH + 1];
uint8_t lineLength = 0;
bool lineOverflow = false;

enum RunState : uint8_t { STATE_REMOTE_IO = 0, STATE_RUNNING = 1, STATE_FAULT = 2, STATE_STOPPED = 3 };
const uint8_t FAULT_WATCHDOG = 3;
const uint8_t FAULT_INVALID_IMAGE = 4;
const uint32_t WATCHDOG_MARKER = 0x57444721UL;
const uint8_t LED_PIN = 13;
const unsigned long BLINK_MS = 250;
const unsigned long TELEMETRY_PERIOD_MS = 50;
const uint8_t TELEMETRY_CHUNK_BYTES = 16;
// A whole TEL frame (at most 55 bytes with its checksum) must fit the 64-byte transmit buffer, so
// that writing it never blocks the program.
const int TELEMETRY_FRAME_ROOM = 60;

stdm_vm vm;
RunState runState = STATE_REMOTE_IO;
uint8_t faultCode = 0;
// Set by the watchdog interrupt, which runs one second before the reset it announces: after a
// reset, the marker tells a watchdog reset from a power-up or a serial reset.
uint32_t watchdogMarker __attribute__((section(".noinit")));

bool watching = false;
uint16_t telemetryOffset = 0;
unsigned long telemetryStart = 0;
uint16_t programTag = 0;  // low 16 bits of the identifier of the running program

bool programming = false;
uint16_t programSize = 0;
uint16_t programWritten = 0;
uint16_t expectedSeq = 0;
unsigned long lastBlink = 0;

bool configured = false;
bool watchdogArmed = false;
bool tripped = false;
unsigned long lastOutFrame = 0;
unsigned long lastInputFrame = 0;

uint8_t crc8(const char* text, uint8_t length) {
  uint8_t crc = 0;
  for (uint8_t i = 0; i < length; i++) {
    crc ^= (uint8_t)text[i];
    for (uint8_t bit = 0; bit < 8; bit++) {
      crc = (crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x07) : (uint8_t)(crc << 1);
    }
  }
  return crc;
}

void sendFrame(const char* body) {
  char hex[4];
  snprintf(hex, sizeof(hex), "%02X", crc8(body, strlen(body)));
  Serial.print(body);
  Serial.print('*');
  Serial.print(hex);
  Serial.print('\n');
}

// Same, for a constant frame body kept in flash: the answers of the board need no RAM.
void sendFrame(const __FlashStringHelper* body) {
  char buffer[32];
  strncpy_P(buffer, (PGM_P)body, sizeof(buffer) - 1);
  buffer[sizeof(buffer) - 1] = '\0';
  sendFrame(buffer);
}

// "2".."13" -> 2..13, "A0".."A5" -> 14..19, anything else -> -1.
int8_t parsePin(const char* token) {
  if (token[0] == 'A' && token[1] >= '0' && token[1] <= '5' && token[2] == '\0') {
    return FIRST_ANALOG + (token[1] - '0');
  }
  if (token[0] < '0' || token[0] > '9') return -1;
  int value = atoi(token);
  if (value < FIRST_PIN || value > 13) return -1;
  return value;
}

void pinName(uint8_t pin, char* out) {
  if (pin >= FIRST_ANALOG) snprintf(out, 4, "A%d", pin - FIRST_ANALOG);
  else snprintf(out, 4, "%d", pin);
}

void applyFallback() {
  for (uint8_t pin = FIRST_PIN; pin < PIN_COUNT; pin++) {
    if (modes[pin] == OUT_DIGITAL) digitalWrite(pin, LOW);
    else if (modes[pin] == OUT_PWM) analogWrite(pin, 0);
  }
}

void resetPins() {
  for (uint8_t pin = FIRST_PIN; pin < PIN_COUNT; pin++) {
    if (modes[pin] == OUT_DIGITAL || modes[pin] == OUT_PWM) {
      if (modes[pin] == OUT_PWM) analogWrite(pin, 0);
      digitalWrite(pin, LOW);
    }
    pinMode(pin, INPUT);
    modes[pin] = UNUSED;
  }
  configured = false;
  watchdogArmed = false;
  tripped = false;
}

ISR(WDT_vect) {
  watchdogMarker = WATCHDOG_MARKER;
}

// Watchdog in interrupt-then-reset mode, about one second per stage, rearmed by every loop turn.
void armWatchdog() {
  cli();
  wdt_reset();
  WDTCSR |= _BV(WDCE) | _BV(WDE);
  WDTCSR = _BV(WDIE) | _BV(WDE) | _BV(WDP2) | _BV(WDP1);
  sei();
}

void disarmWatchdog() {
  cli();
  wdt_reset();
  MCUSR = 0;
  WDTCSR |= _BV(WDCE) | _BV(WDE);
  WDTCSR = 0;
  sei();
}

// ----- Platform of the bytecode VM -----

uint8_t platformReadByte(void*, uint16_t addr) { return EEPROM.read(addr); }
uint32_t platformMillis(void*) { return millis(); }

void platformConfigurePin(void*, uint8_t pin, uint8_t role) {
  switch (role) {
    case STDM_ROLE_DIGITAL_INPUT: modes[pin] = IN; pinMode(pin, INPUT); break;
    case STDM_ROLE_DIGITAL_INPUT_PULLUP: modes[pin] = IN_PULLUP; pinMode(pin, INPUT_PULLUP); break;
    case STDM_ROLE_ANALOG_INPUT: modes[pin] = IN_ANALOG; pinMode(pin, INPUT); break;
    case STDM_ROLE_DIGITAL_OUTPUT:
      modes[pin] = OUT_DIGITAL;
      digitalWrite(pin, LOW);
      pinMode(pin, OUTPUT);
      break;
    default:
      modes[pin] = OUT_PWM;
      digitalWrite(pin, LOW);
      pinMode(pin, OUTPUT);
      break;
  }
  if (role <= STDM_ROLE_DIGITAL_INPUT_PULLUP) {
    bool raw = digitalRead(pin) == HIGH;
    debouncedState[pin] = raw;
    lastRaw[pin] = raw;
    lastRawChange[pin] = millis();
  }
}

uint8_t platformReadDigital(void*, uint8_t pin) { return debouncedState[pin] ? 1 : 0; }

uint16_t platformReadAnalog(void*, uint8_t pin) {
  uint32_t sum = 0;
  for (uint8_t i = 0; i < ANALOG_SAMPLES; i++) sum += analogRead(pin - FIRST_ANALOG);
  return (uint16_t)(sum / ANALOG_SAMPLES);
}

void platformWriteDigital(void*, uint8_t pin, uint8_t level) { digitalWrite(pin, level ? HIGH : LOW); }
void platformWritePwm(void*, uint8_t pin, uint8_t value) { analogWrite(pin, value); }

const stdm_platform platform = {
  NULL, platformReadByte, platformMillis, platformConfigurePin, platformReadDigital,
  platformReadAnalog, platformWriteDigital, platformWritePwm,
};

// Identifier of the image in the EEPROM, 0 when its header or checksum is not valid.
uint32_t storedImageId() {
  if (stdm_vm_verify(&platform, EEPROM.length()) != STDM_OK) return 0;
  uint32_t id = 0;
  for (uint8_t i = 0; i < 4; i++) id |= (uint32_t)EEPROM.read(22 + i) << (8 * i);
  return id;
}

void enterFault(uint8_t code) {
  runState = STATE_FAULT;
  faultCode = code;
  disarmWatchdog();
  lastBlink = millis();
}

// Starts the stored program. Returns the verification or memory status of the VM.
stdm_status startProgram() {
  resetPins();
  stdm_status status = stdm_vm_start(&vm, &platform, EEPROM.length());
  if (status != STDM_OK) {
    resetPins();
    runState = STATE_REMOTE_IO;
    return status;
  }
  runState = STATE_RUNNING;
  faultCode = 0;
  watching = false;
  telemetryOffset = 0;
  programTag = (uint16_t)EEPROM.read(22) | ((uint16_t)EEPROM.read(23) << 8);
  armWatchdog();
  return STDM_OK;
}

// Releases the pins and the watchdog; the stored program stays in the EEPROM.
void stopProgram() {
  watching = false;
  if (runState == STATE_REMOTE_IO) return;
  disarmWatchdog();
  resetPins();
  runState = STATE_REMOTE_IO;
  faultCode = 0;
}

// Halts the program without handing the pins to the host.
void haltProgram() {
  stopProgram();
  runState = STATE_STOPPED;
}

void handlePing() {
  char body[64];
  snprintf(body, sizeof(body), "PONG STUDOMATE_REMOTE_IO %s %s %d", PROTOCOL_VERSION, FIRMWARE_VERSION, INPUT_PERIOD_MS);
  sendFrame(body);
}

void handleConfig(char* args) {
  programming = false;
  stopProgram();
  Mode wanted[PIN_COUNT];
  for (uint8_t i = 0; i < PIN_COUNT; i++) wanted[i] = UNUSED;

  for (char* token = strtok(args, " "); token != NULL; token = strtok(NULL, " ")) {
    char* colon = strchr(token, ':');
    if (colon == NULL) { sendFrame(F("ERR FORMAT")); return; }
    *colon = '\0';
    int8_t pin = parsePin(token);
    if (pin < 0) { sendFrame(F("ERR PIN")); return; }
    const char* mode = colon + 1;
    if (strcmp(mode, "I") == 0) wanted[pin] = IN;
    else if (strcmp(mode, "IP") == 0) wanted[pin] = IN_PULLUP;
    else if (strcmp(mode, "O") == 0) wanted[pin] = OUT_DIGITAL;
    else if (strcmp(mode, "P") == 0) wanted[pin] = OUT_PWM;
    else if (strcmp(mode, "A") == 0 && pin >= FIRST_ANALOG) wanted[pin] = IN_ANALOG;
    else { sendFrame(F("ERR MODE")); return; }
  }

  resetPins();
  unsigned long now = millis();
  for (uint8_t pin = FIRST_PIN; pin < PIN_COUNT; pin++) {
    modes[pin] = wanted[pin];
    switch (wanted[pin]) {
      case IN: pinMode(pin, INPUT); break;
      case IN_PULLUP: pinMode(pin, INPUT_PULLUP); break;
      case OUT_DIGITAL:
      case OUT_PWM:
        digitalWrite(pin, LOW);
        pinMode(pin, OUTPUT);
        break;
      default: break;
    }
    if (wanted[pin] == IN || wanted[pin] == IN_PULLUP) {
      bool raw = digitalRead(pin) == HIGH;
      debouncedState[pin] = raw;
      lastRaw[pin] = raw;
      lastRawChange[pin] = now;
    }
  }
  configured = true;
  sendFrame(F("CFG_OK"));
}

void handleOutputs(char* args) {
  if (!configured) return;
  for (char* token = strtok(args, " "); token != NULL; token = strtok(NULL, " ")) {
    char* equals = strchr(token, '=');
    if (equals == NULL) continue;
    *equals = '\0';
    int8_t pin = parsePin(token);
    if (pin < 0) continue;
    int value = atoi(equals + 1);
    if (modes[pin] == OUT_DIGITAL) digitalWrite(pin, value != 0 ? HIGH : LOW);
    else if (modes[pin] == OUT_PWM) analogWrite(pin, constrain(value, 0, 255));
  }
  lastOutFrame = millis();
  watchdogArmed = true;
  tripped = false;
}

bool hexByte(const char* text, uint8_t* out) {
  uint8_t value = 0;
  for (uint8_t i = 0; i < 2; i++) {
    char c = text[i];
    uint8_t digit;
    if (c >= '0' && c <= '9') digit = c - '0';
    else if (c >= 'A' && c <= 'F') digit = c - 'A' + 10;
    else if (c >= 'a' && c <= 'f') digit = c - 'a' + 10;
    else return false;
    value = (uint8_t)((value << 4) | digit);
  }
  *out = value;
  return true;
}

void handleStatus() {
  char body[48];
  snprintf(body, sizeof(body), "STATUS %d %d %08lX", runState, faultCode, (unsigned long)storedImageId());
  sendFrame(body);
}

void handleProgramBegin(char* args) {
  char* size = strtok(args, " ");
  if (size == NULL || strtok(NULL, " ") == NULL) { sendFrame(F("ERR PROG_FORMAT")); return; }
  long value = atol(size);
  if (value <= 0 || value > (long)EEPROM.length()) { sendFrame(F("ERR PROG_SIZE")); return; }
  stopProgram();
  resetPins();
  programming = true;
  programSize = (uint16_t)value;
  programWritten = 0;
  expectedSeq = 0;
  sendFrame(F("PROG_READY"));
}

void handleProgramChunk(char* args) {
  if (!programming) { sendFrame(F("ERR PROG_STATE")); return; }
  char* seqText = strtok(args, " ");
  char* hex = strtok(NULL, " ");
  if (seqText == NULL || hex == NULL) { sendFrame(F("ERR PROG_FORMAT")); return; }
  uint16_t seq = (uint16_t)atoi(seqText);
  char body[24];
  if (expectedSeq > 0 && seq == expectedSeq - 1) {  // answer to the previous chunk was lost
    snprintf(body, sizeof(body), "PROG_ACK %u", seq);
    sendFrame(body);
    return;
  }
  size_t digits = strlen(hex);
  if (seq != expectedSeq) { sendFrame(F("ERR PROG_SEQ")); return; }
  if (digits % 2 != 0 || programWritten + digits / 2 > programSize) { sendFrame(F("ERR PROG_FORMAT")); return; }
  for (size_t i = 0; i < digits; i += 2) {
    uint8_t byte;
    if (!hexByte(hex + i, &byte)) { sendFrame(F("ERR PROG_FORMAT")); return; }
    EEPROM.update(programWritten++, byte);
  }
  expectedSeq++;
  snprintf(body, sizeof(body), "PROG_ACK %u", seq);
  sendFrame(body);
}

void handleProgramEnd() {
  if (!programming) { sendFrame(F("ERR PROG_STATE")); return; }
  programming = false;
  if (programWritten != programSize) { sendFrame(F("ERR PROG_INVALID")); return; }
  stdm_status status = startProgram();
  if (status == STDM_ERR_RAM) { sendFrame(F("ERR PROG_RAM")); return; }
  if (status != STDM_OK) { sendFrame(F("ERR PROG_INVALID")); return; }
  char body[24];
  snprintf(body, sizeof(body), "PROG_OK %08lX", (unsigned long)storedImageId());
  sendFrame(body);
}

void handleWatch(char* args) {
  if (args[0] != '1') {
    watching = false;
    sendFrame(F("WATCH_OK"));
    return;
  }
  if (runState != STATE_RUNNING) { sendFrame(F("ERR WATCH_STATE")); return; }
  watching = true;
  telemetryOffset = 0;
  telemetryStart = 0;
  sendFrame(F("WATCH_OK"));
}

// Parses `<idx> [<value>]`; false when the index is not a variable of the running program.
bool parseVariableArgs(char* args, bool withValue, uint8_t* index, int32_t* value) {
  char* indexText = strtok(args, " ");
  char* valueText = withValue ? strtok(NULL, " ") : NULL;
  if (indexText == NULL || (withValue && valueText == NULL)) { sendFrame(F("ERR FORCE_FORMAT")); return false; }
  int parsed = atoi(indexText);
  if (parsed < 0 || parsed >= stdm_vm_variable_count(&vm)) { sendFrame(F("ERR FORCE_INDEX")); return false; }
  *index = (uint8_t)parsed;
  if (withValue) *value = atol(valueText);
  return true;
}

void handleSetVariable(char* args) {
  if (runState != STATE_RUNNING) { sendFrame(F("ERR FORCE_STATE")); return; }
  uint8_t index;
  int32_t value;
  if (!parseVariableArgs(args, true, &index, &value)) return;
  stdm_vm_set_variable(&vm, index, value);
  sendFrame(F("SET_OK"));
}

void handleForce(char* args) {
  if (runState != STATE_RUNNING) { sendFrame(F("ERR FORCE_STATE")); return; }
  uint8_t index;
  int32_t value;
  if (!parseVariableArgs(args, true, &index, &value)) return;
  stdm_vm_force(&vm, index, value);
  sendFrame(F("FORCE_OK"));
}

void handleUnforce(char* args) {
  if (runState != STATE_RUNNING) { sendFrame(F("ERR FORCE_STATE")); return; }
  if (args[0] == 'A') {
    stdm_vm_release_all(&vm);
  } else {
    uint8_t index;
    int32_t value;
    if (!parseVariableArgs(args, false, &index, &value)) return;
    stdm_vm_release(&vm, index);
  }
  sendFrame(F("FORCE_OK"));
}

void handleProgramRun() {
  programming = false;
  if (storedImageId() == 0) { sendFrame(F("ERR PROG_INVALID")); return; }
  stdm_status status = startProgram();
  if (status == STDM_ERR_RAM) { sendFrame(F("ERR PROG_RAM")); return; }
  if (status != STDM_OK) { sendFrame(F("ERR PROG_INVALID")); return; }
  char body[24];
  snprintf(body, sizeof(body), "PROG_OK %08lX", (unsigned long)storedImageId());
  sendFrame(body);
}

void handleProgramStop() {
  programming = false;
  haltProgram();
  sendFrame(F("PROG_STOPPED"));
}

void handleLine() {
  line[lineLength] = '\0';
  if (lineLength > 0 && line[lineLength - 1] == '\r') line[--lineLength] = '\0';
  char* star = strrchr(line, '*');
  if (star == NULL || (line + lineLength) - star != 3) return;
  char expected[4];
  snprintf(expected, sizeof(expected), "%02X", crc8(line, star - line));
  if (strcasecmp(expected, star + 1) != 0) return;
  *star = '\0';

  char* args = strchr(line, ' ');
  if (args != NULL) { *args = '\0'; args++; } else { args = star; }
  if (strcmp(line, "PING") == 0) handlePing();
  else if (strcmp(line, "CFG") == 0) handleConfig(args);
  else if (strcmp(line, "OUT") == 0) handleOutputs(args);
  else if (strcmp(line, "STATUS") == 0) handleStatus();
  else if (strcmp(line, "PROG_BEGIN") == 0) handleProgramBegin(args);
  else if (strcmp(line, "PROG_CHUNK") == 0) handleProgramChunk(args);
  else if (strcmp(line, "PROG_END") == 0) handleProgramEnd();
  else if (strcmp(line, "PROG_RUN") == 0) handleProgramRun();
  else if (strcmp(line, "PROG_STOP") == 0) handleProgramStop();
  else if (strcmp(line, "WATCH") == 0) handleWatch(args);
  else if (strcmp(line, "SET") == 0) handleSetVariable(args);
  else if (strcmp(line, "FORCE") == 0) handleForce(args);
  else if (strcmp(line, "UNFORCE") == 0) handleUnforce(args);
}

void readSerial() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n') {
      if (!lineOverflow) handleLine();
      lineLength = 0;
      lineOverflow = false;
    } else if (lineLength < MAX_FRAME_LENGTH) {
      line[lineLength++] = c;
    } else {
      lineOverflow = true;
    }
  }
}

void updateDebounce() {
  unsigned long now = millis();
  for (uint8_t pin = FIRST_PIN; pin < PIN_COUNT; pin++) {
    if (modes[pin] != IN && modes[pin] != IN_PULLUP) continue;
    bool raw = digitalRead(pin) == HIGH;
    if (raw != lastRaw[pin]) {
      lastRaw[pin] = raw;
      lastRawChange[pin] = now;
    } else if (raw != debouncedState[pin] && now - lastRawChange[pin] >= DEBOUNCE_MS) {
      debouncedState[pin] = raw;
    }
  }
}

void sendInputs() {
  char body[MAX_FRAME_LENGTH];
  size_t length = snprintf(body, sizeof(body), "IN");
  bool any = false;
  for (uint8_t pin = FIRST_PIN; pin < PIN_COUNT; pin++) {
    int value;
    if (modes[pin] == IN || modes[pin] == IN_PULLUP) {
      value = debouncedState[pin] ? 1 : 0;
    } else if (modes[pin] == IN_ANALOG) {
      long sum = 0;
      for (uint8_t i = 0; i < ANALOG_SAMPLES; i++) sum += analogRead(pin - FIRST_ANALOG);
      value = (int)(sum / ANALOG_SAMPLES);
    } else {
      continue;
    }
    char name[4];
    pinName(pin, name);
    if (length + 9 > sizeof(body) - 4) break;
    length += snprintf(body + length, sizeof(body) - length, " %s=%d", name, value);
    any = true;
  }
  if (any) sendFrame(body);
}

void setup() {
  bool watchdogReset = watchdogMarker == WATCHDOG_MARKER;
  watchdogMarker = 0;
  MCUSR = 0;
  disarmWatchdog();
  for (uint8_t i = 0; i < PIN_COUNT; i++) modes[i] = UNUSED;
  Serial.begin(115200);
  if (watchdogReset) enterFault(FAULT_WATCHDOG);
  else startProgram();
}

void runProgram() {
  wdt_reset();
  if (runState != STATE_RUNNING) return;
  updateDebounce();
  stdm_vm_poll(&vm);
  if (stdm_vm_fault(&vm) != 0) enterFault(stdm_vm_fault(&vm));
}

// Sends the variable memory of the running program, one frame per turn of the loop and only when
// the transmit buffer can take it whole. A new image starts every TELEMETRY_PERIOD_MS.
void emitTelemetry() {
  if (!watching || runState != STATE_RUNNING) return;
  uint16_t size = stdm_vm_memory_size(&vm);
  if (size == 0) return;
  unsigned long now = millis();
  if (telemetryOffset == 0 && now - telemetryStart < TELEMETRY_PERIOD_MS) return;
  if (Serial.availableForWrite() < TELEMETRY_FRAME_ROOM) return;

  uint16_t remaining = size - telemetryOffset;
  uint8_t count = remaining < TELEMETRY_CHUNK_BYTES ? (uint8_t)remaining : TELEMETRY_CHUNK_BYTES;
  const uint8_t* memory = stdm_vm_memory(&vm);
  char body[64];
  int length = snprintf(body, sizeof(body), "TEL %04X %u %u ", programTag, stdm_vm_cycle_count(&vm), telemetryOffset);
  for (uint8_t i = 0; i < count; i++) {
    length += snprintf(body + length, 3, "%02X", memory[telemetryOffset + i]);
  }
  sendFrame(body);

  if (telemetryOffset == 0) telemetryStart = now;
  telemetryOffset += count;
  if (telemetryOffset >= size) telemetryOffset = 0;
}

// A fault is shown on the built-in LED, unless the program drives it.
void blinkFault(unsigned long now) {
  if (modes[LED_PIN] != UNUSED || now - lastBlink < BLINK_MS) return;
  lastBlink = now;
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, !digitalRead(LED_PIN));
}

void loop() {
  readSerial();
  runProgram();
  emitTelemetry();
  unsigned long now = millis();
  if (runState == STATE_FAULT) blinkFault(now);

  if (configured) {
    updateDebounce();
    if (now - lastInputFrame >= INPUT_PERIOD_MS) {
      lastInputFrame = now;
      sendInputs();
    }
  }

  if (watchdogArmed && !tripped && now - lastOutFrame > WATCHDOG_TIMEOUT) {
    applyFallback();
    tripped = true;
  }
}
