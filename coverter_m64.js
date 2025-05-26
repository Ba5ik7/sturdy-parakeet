const fs = require('fs');
const path = require('path');

const HEADER_SIZE = 0x400;
const OUTPUT_FILE = path.join(__dirname, '1key.m64');
const FRAMES_PER_BUTTON = 90; // 3 sec @ 30fps
const FRAMES_PAUSE = 120; // 2 sec pause

const stickNeutral = 0x00;

// Correct N64 button bit positions
const BUTTONS = [
  { name: 'A', bit: 7 },
  { name: 'B', bit: 6 },
  { name: 'Z', bit: 5 },
  { name: 'Start', bit: 4 },
  { name: 'D-Up', bit: 3 },
  { name: 'D-Down', bit: 2 },
  { name: 'D-Left', bit: 1 },
  { name: 'D-Right', bit: 0 },
  { name: 'L', bit: 13 },
  { name: 'R', bit: 12 },
  { name: 'C-Up', bit: 11 },
  { name: 'C-Down', bit: 10 },
  { name: 'C-Left', bit: 9 },
  { name: 'C-Right', bit: 8 },
];

const frameToBytes = (buttonMask, stickX, stickY) => {
  const buffer = Buffer.alloc(4);
  buffer[0] = stickX & 0xFF;               // byte 0: stick X
  buffer[1] = stickY & 0xFF;               // byte 1: stick Y
  buffer[2] = (buttonMask >> 8) & 0xFF;    // byte 2: button bits 8–15
  buffer[3] = buttonMask & 0xFF;           // byte 3: button bits 0–7
  return buffer;
};

const output = [];

// Write 0x400-byte header
output.push(Buffer.alloc(HEADER_SIZE, 0x00));

// 🅰️ Step through each button
BUTTONS.forEach(({ name, bit }) => {
  const mask = 1 << bit;
  console.log(`Encoding button: ${name}`);

  for (let i = 0; i < FRAMES_PER_BUTTON; i++) {
    output.push(frameToBytes(mask, stickNeutral, stickNeutral));
  }

  for (let i = 0; i < FRAMES_PAUSE; i++) {
    output.push(frameToBytes(0x0000, stickNeutral, stickNeutral));
  }
});

// ➕ Draw a cross with joystick
console.log(`Encoding joystick cross pattern...`);
const JOY_RANGE = 80;

const crossPositions = [
  { x: 0, y: JOY_RANGE },    // Right
  { x: 0, y: -JOY_RANGE },   // Left
  { x: -JOY_RANGE, y: 0 },   // Down
  { x: JOY_RANGE, y: 0 }     // UP
];

crossPositions.forEach(({ x, y }) => {
  for (let i = 0; i < FRAMES_PER_BUTTON; i++) {
    output.push(frameToBytes(0x0000, x, y));
  }
  for (let i = 0; i < FRAMES_PAUSE; i++) {
    output.push(frameToBytes(0x0000, stickNeutral, stickNeutral));
  }
});

// 🌀 Draw a circle (approximate)
console.log(`Encoding joystick circular pattern...`);
const circleSteps = 60; // 2 seconds of motion at 30 FPS
for (let i = 0; i < circleSteps; i++) {
  const angle = (i / circleSteps) * 2 * Math.PI;
  const x = Math.round(Math.cos(angle) * JOY_RANGE);
  const y = Math.round(Math.sin(angle) * JOY_RANGE);
  output.push(frameToBytes(0x0000, x, y));
}

// End with neutral
for (let i = 0; i < FRAMES_PAUSE; i++) {
  output.push(frameToBytes(0x0000, stickNeutral, stickNeutral));
}

fs.writeFileSync(OUTPUT_FILE, Buffer.concat(output));
console.log(`✅ Joystick test .m64 written to: ${OUTPUT_FILE}`);
