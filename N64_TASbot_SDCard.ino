#define N64_PIN 2
#include <SD.h>
#include <SPI.h>

#define INPUT_FILENAME "1key.m64"
#define BUFFER_SIZE 64

File m64File;
uint32_t inputBuffer[BUFFER_SIZE];
uint8_t bufferIndex = 0;
bool finished = false;

void setup() {
  pinMode(N64_PIN, INPUT_PULLUP);

  if (!SD.begin(BUILTIN_SDCARD)) {
    while (1); // halt if SD card fails
  }

  m64File = SD.open(INPUT_FILENAME);
  if (!m64File) {
    while (1); // halt if file not found
  }

  // Skip M64 header (0x400 offset)
  m64File.seek(0x400);
  refillBuffer();
}

uint8_t readCommandByte() {
  uint8_t cmd = 0;
  for (int i = 0; i < 8; i++) {
    while (digitalReadFast(N64_PIN) == HIGH);
    uint32_t startTime = micros();
    while (digitalReadFast(N64_PIN) == LOW);
    uint32_t pulseLength = micros() - startTime;
    bool bit = (pulseLength < 2);
    cmd = (cmd << 1) | bit;
  }
  return cmd;
}

void sendBit(bool bit) {
  pinMode(N64_PIN, OUTPUT);
  digitalWriteFast(N64_PIN, LOW);
  delayMicroseconds(bit ? 1 : 3);
  pinMode(N64_PIN, INPUT_PULLUP);
  delayMicroseconds(bit ? 3 : 1);
}

void sendPacket(uint32_t packet, bool extended) {
  sendBit(0);
  for (int i = 31; i >= 0; i--) {
    sendBit((packet >> i) & 1);
  }
  sendBit(1);
  if (extended) {
    uint8_t extra = 0xFF;
    for (int i = 7; i >= 0; i--) {
      sendBit((extra >> i) & 1);
    }
  }
}

bool refillBuffer() {
  if (!m64File.available()) return false;
  size_t bytesRead = m64File.read((uint8_t*)inputBuffer, BUFFER_SIZE * 4);
  return bytesRead > 0;
}

void loop() {
  if (finished) return;

  while (digitalReadFast(N64_PIN) == HIGH);
  while (digitalReadFast(N64_PIN) == LOW);
  delayMicroseconds(3);

  noInterrupts();
  uint8_t cmd = readCommandByte();
  bool extended = (cmd != 0x01);

  sendPacket(inputBuffer[bufferIndex], extended);
  interrupts();

  bufferIndex++;
  if (bufferIndex >= BUFFER_SIZE) {
    if (!refillBuffer()) {
      finished = true;
    }
    bufferIndex = 0;
  }

  delayMicroseconds(100);
}
