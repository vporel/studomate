// Studomate remote I/O firmware (Arduino Uno R3).
//
// Serves the pins of the board to Studomate over the serial link. Frames are ASCII lines
// `COMMAND args*CC\n`, CC being the CRC-8 (poly 0x07) of everything before `*`.
//
//   host  -> PING                      board -> PONG STUDOMATE_REMOTE_IO <protocol> <firmware> <period>
//   host  -> CFG 2:IP 13:O A0:A        board -> CFG_OK | ERR <PIN|MODE|FORMAT>
//   host  -> OUT 13=1 9=128            (full image of the outputs, doubles as the watchdog heartbeat)
//   board -> IN 2=1 A0=512             (full image of the inputs, every INPUT_PERIOD_MS)
//
// Modes: I input, IP input with pull-up, O output, P PWM output, A analog input.
// Without a valid OUT frame for WATCHDOG_TIMEOUT ms, every output falls back to 0.

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

void handlePing() {
  char body[64];
  snprintf(body, sizeof(body), "PONG STUDOMATE_REMOTE_IO %s %s %d", PROTOCOL_VERSION, FIRMWARE_VERSION, INPUT_PERIOD_MS);
  sendFrame(body);
}

void handleConfig(char* args) {
  Mode wanted[PIN_COUNT];
  for (uint8_t i = 0; i < PIN_COUNT; i++) wanted[i] = UNUSED;

  for (char* token = strtok(args, " "); token != NULL; token = strtok(NULL, " ")) {
    char* colon = strchr(token, ':');
    if (colon == NULL) { sendFrame("ERR FORMAT"); return; }
    *colon = '\0';
    int8_t pin = parsePin(token);
    if (pin < 0) { sendFrame("ERR PIN"); return; }
    const char* mode = colon + 1;
    if (strcmp(mode, "I") == 0) wanted[pin] = IN;
    else if (strcmp(mode, "IP") == 0) wanted[pin] = IN_PULLUP;
    else if (strcmp(mode, "O") == 0) wanted[pin] = OUT_DIGITAL;
    else if (strcmp(mode, "P") == 0) wanted[pin] = OUT_PWM;
    else if (strcmp(mode, "A") == 0 && pin >= FIRST_ANALOG) wanted[pin] = IN_ANALOG;
    else { sendFrame("ERR MODE"); return; }
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
  sendFrame("CFG_OK");
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
  for (uint8_t i = 0; i < PIN_COUNT; i++) modes[i] = UNUSED;
  Serial.begin(115200);
}

void loop() {
  readSerial();
  unsigned long now = millis();

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
