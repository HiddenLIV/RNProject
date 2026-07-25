// 측정 중 오디오 포커스를 유지하기 위한 무음 WAV(1초, 16-bit mono 44.1kHz)를 생성한다
// 실행: node scripts/make-silence-sound.js  (→ assets/sounds/silence.wav)
const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 1.0;
const n = Math.floor(sampleRate * duration);
const pcm = Buffer.alloc(n * 2); // 전부 0 = 무음

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const out = process.argv[2] || path.join(__dirname, '..', 'assets', 'sounds', 'silence.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, pcm]));
console.log('written', out, header.length + pcm.length, 'bytes');
