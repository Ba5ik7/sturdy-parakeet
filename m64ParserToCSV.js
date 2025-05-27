// m64ParserToCSV.js
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const INPUT_FILE = path.join(__dirname, 'converted_movie.m64');
const HEADER_SIZE = 0x400;
const FRAME_SIZE = 4;

const BUTTON_BITS = [
  { name: 'A', bit: 15 },
  { name: 'B', bit: 14 },
  { name: 'Z', bit: 13 },
  { name: 'Start', bit: 12 },
  { name: 'D-Up', bit: 11 },
  { name: 'D-Down', bit: 10 },
  { name: 'D-Left', bit: 9 },
  { name: 'D-Right', bit: 8 },
  { name: 'L', bit: 5 },
  { name: 'R', bit: 4 },
  { name: 'C-Up', bit: 3 },
  { name: 'C-Down', bit: 2 },
  { name: 'C-Left', bit: 1 },
  { name: 'C-Right', bit: 0 },
];

function decodeButtons(buttonMask) {
  const pressed = [];
  BUTTON_BITS.forEach(({ name, bit }) => {
    if (buttonMask & (1 << bit)) {
      pressed.push(name);
    }
  });
  return pressed.join(' + ');
}

function parseM64(filePath) {
  const buffer = fs.readFileSync(filePath);
  const totalFrames = (buffer.length - HEADER_SIZE) / FRAME_SIZE;

  const rows = [];

  for (let i = 0; i < totalFrames; i++) {
    const offset = HEADER_SIZE + i * FRAME_SIZE;
    const stickX = buffer.readInt8(offset);
    const stickY = buffer.readInt8(offset + 1);
    const buttonHigh = buffer.readUInt8(offset + 2);
    const buttonLow = buffer.readUInt8(offset + 3);

    const buttonMask = (buttonHigh << 8) | buttonLow;
    const buttonList = decodeButtons(buttonMask);

    rows.push({
      frame: i,
      stickX,
      stickY,
      buttonMask: `0x${buttonMask.toString(16).padStart(4, '0')}`,
      buttons: buttonList || 'None'
    });
  }

  return rows;
}

const csv = csvWriter({
  path: path.join(__dirname, 'converted_movie.csv'),
  header: [
    { id: 'frame', title: 'Frame' },
    { id: 'stickX', title: 'Stick X' },
    { id: 'stickY', title: 'Stick Y' },
    { id: 'buttonMask', title: 'Button Mask' },
    { id: 'buttons', title: 'Buttons Pressed' },
  ]
});

const parsedData = parseM64(INPUT_FILE);
csv.writeRecords(parsedData)
  .then(() => console.log('✅ CSV written to converted_movie.csv'))
  .catch(err => console.error('❌ Failed to write CSV:', err));
