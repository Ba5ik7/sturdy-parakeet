const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const BUTTON_BITS = {
  A: 15,
  B: 14,
  Z: 13,
  Start: 12,
  'D-Up': 11,
  'D-Down': 10,
  'D-Left': 9,
  'D-Right': 8,
  L: 5,
  R: 4,
  'C-Up': 3,
  'C-Down': 2,
  'C-Left': 1,
  'C-Right': 0,
};

const BUTTON_CHAR_INDEX = {
  0: 'A-Up',
  1: 'A-Down',
  2: 'A-Left',
  3: 'A-Right',
  4: 'D-Up',
  5: 'D-Down',
  6: 'D-Left',
  7: 'D-Right',
  8: 'Start',
  9: 'Z',
  10: 'B',
  11: 'A',
  12: 'C-Up',
  13: 'C-Down',
  14: 'C-Left',
  15: 'C-Right',
  16: 'L',
  17: 'R'
};

function frameToBytes(buttonMask, stickX, stickY) {
  const buffer = Buffer.alloc(4);
  buffer.writeInt8(stickX, 0);
  buffer.writeInt8(stickY, 1);
  buffer.writeUInt8((buttonMask >> 8) & 0xff, 2);
  buffer.writeUInt8(buttonMask & 0xff, 3);
  return buffer;
}

async function convertBk2ToM64(bk2Path, outputM64Path) {
  const directory = await unzipper.Open.file(bk2Path);
  console.log("Files inside BK2:");
  directory.files.forEach(f => console.log(f.path));

  const inputLogEntry = directory.files.find(file =>
    file.path.toLowerCase().replace(/\s+/g, '') === 'inputlog.txt'
  );
  if (!inputLogEntry) {
    throw new Error('InputLog.txt not found in the .bk2 file.');
  }

  const inputLogContent = await inputLogEntry.buffer();
  const inputLines = inputLogContent.toString().split('\n');

  const frames = [];
  let parsing = false;

  for (const line of inputLines) {
    if (line.startsWith('[Input]')) {
      parsing = true;
      continue;
    }

    if (!parsing || !line.startsWith('|')) continue;

    const parts = line.split('|');
    if (parts.length < 4) continue;

    const buttonsAndStickParts = parts[2].trim();
    const buttonsAndStickPositionArray = buttonsAndStickParts.split(',');
    if (buttonsAndStickPositionArray.length < 3) continue;

    let stickX = parseInt(buttonsAndStickPositionArray[0].trim(), 10);
    let stickY = parseInt(buttonsAndStickPositionArray[1].trim(), 10);

    const buttonsRaw = buttonsAndStickPositionArray.slice(2).join(',').trim();

    let buttonMask = 0;
    for (let i = 0; i < buttonsRaw.length; i++) {
      const ch = buttonsRaw[i];
      if (ch !== '.' && BUTTON_CHAR_INDEX[i]) {
        const bitName = BUTTON_CHAR_INDEX[i];
        const bit = BUTTON_BITS[bitName];
        if (bit !== undefined) {
          buttonMask |= (1 << bit);
        }
      }
    }

    frames.push(frameToBytes(buttonMask, stickX, stickY));
  }

  const header = Buffer.alloc(0x400, 0);
  const m64Buffer = Buffer.concat([header, ...frames]);
  fs.writeFileSync(outputM64Path, m64Buffer);
  console.log(`✅ Wrote ${frames.length} frames to ${outputM64Path}`);
}

const bk2FilePath = path.join(__dirname, 'Stick_Test.bk2');
const m64OutputPath = path.join(__dirname, '1key.m64');
convertBk2ToM64(bk2FilePath, m64OutputPath)
  .then(() => console.log('✅ Conversion complete.'))
  .catch(err => console.error('❌ Conversion failed:', err));
