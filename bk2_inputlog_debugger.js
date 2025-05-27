const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

(async function debugBk2() {
  const bk2Path = path.join(__dirname, 'WaveRace.bk2');
  const directory = await unzipper.Open.file(bk2Path);
  const inputLogEntry = directory.files.find(file => file.path.toLowerCase().replace(/\s+/g, '') === 'inputlog.txt');
  if (!inputLogEntry) throw new Error('InputLog.txt not found in .bk2');

  const inputLogContent = await inputLogEntry.buffer();
  const lines = inputLogContent.toString().split('\n');

  let parsing = false;
  const debuggerOutput = [];
  for (const line of lines) {
    if (line.startsWith('[Input]')) {
      parsing = true;
      continue;
    }
    if (!parsing || !line.startsWith('|')) continue;

    // |..| -126,  -12,...........A......|
    // |..| -126,  -12,...........A......|
    const parts = line.split('|');
    const buttonsAndStickParts = parts[2].trim();
    const buttonsAndStickPositionArray = buttonsAndStickParts.split(',');
    const stickXYPosition = [
      buttonsAndStickPositionArray[0].trim(),
      buttonsAndStickPositionArray[1].trim()
    ];
    const buttonsBeingPressed = buttonsAndStickPositionArray.slice(2).join(',').trim();


    if (parts.length < 4) continue;
    console.log(`stickRaw: '${stickXYPosition}' | buttonsRaw: '${buttonsBeingPressed}'`);
    debuggerOutput.push({
      stickX: stickXYPosition[0],
      stickY: stickXYPosition[1],
      buttons: buttonsBeingPressed
    });
  }

  const outputFilePath = path.join(__dirname, 'debugger_output.json');
  fs.writeFileSync(outputFilePath, JSON.stringify(debuggerOutput, null, 2));
  console.log(`Debugger output written to ${outputFilePath}`);
  console.log(`Total frames parsed: ${debuggerOutput.length}`);
})();
