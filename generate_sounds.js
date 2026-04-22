const fs = require('fs');

function writeWav(filename, frequency, duration, type) {
    const sampleRate = 44100;
    const numSamples = duration * sampleRate;
    const buffer = Buffer.alloc(44 + numSamples * 2);

    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write('WAVE', 8);

    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
    buffer.writeUInt16LE(1, 22); // NumChannels (Mono)
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
    buffer.writeUInt16LE(2, 32); // BlockAlign
    buffer.writeUInt16LE(16, 34); // BitsPerSample

    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(numSamples * 2, 40);

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;
        
        // Envelope (fade out)
        const envelope = Math.exp(-t * 5);
        
        if (type === 'sine') {
            sample = Math.sin(2 * Math.PI * frequency * t);
        } else if (type === 'square') {
            sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
        } else if (type === 'sawtooth') {
            sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
        } else if (type === 'triangle') {
            sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
        } else if (type === 'noise') {
            sample = Math.random() * 2 - 1;
        }

        const value = Math.max(-1, Math.min(1, sample * envelope * 0.3)) * 32767;
        buffer.writeInt16LE(value, 44 + i * 2);
    }

    fs.writeFileSync(filename, buffer);
    console.log(`Created ${filename}`);
}

const outDir = '/workspace/logos-match/public/sounds/';
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Click: short high blip
writeWav(outDir + 'click.wav', 800, 0.1, 'sine');
// Place: short lower blip
writeWav(outDir + 'place.wav', 400, 0.15, 'triangle');
// Join: rising two notes (approximated by high frequency)
writeWav(outDir + 'join.wav', 600, 0.3, 'sine');
// Correct: high pitched
writeWav(outDir + 'correct.wav', 1000, 0.4, 'sine');
// Wrong: low pitched buzz
writeWav(outDir + 'wrong.wav', 150, 0.4, 'sawtooth');
// Win: triumphant
writeWav(outDir + 'win.wav', 800, 0.6, 'square');
