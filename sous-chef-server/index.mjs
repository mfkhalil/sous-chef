import express from "express";
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import { exec } from 'child_process';
const execAsync = promisify(exec);
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const port = 2000;

const openai = new OpenAI(process.env.OPENAI_API_KEY);

app.post('/audioToText', async (req, res) => {
    const { base64Audio } = req.body;
    const audio = Buffer.from(base64Audio, 'base64');
    try {
        const text = await convertAudioToText(audio);
        return res.status(200).json({ text });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: `Could not convert audio to text: ${error}` });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

async function convertAudioToText(audio) {
    const mp3Audio = await convertAudioToMp3(audio);
    const outputPath = `/tmp/${uuidv4()}.mp3`;
    fs.writeFileSync(outputPath, mp3Audio);
    const response = await openai.audio.transcriptions.create({
        file: fs.createReadStream(outputPath),
        model: "whisper-1"
    });
    fs.unlinkSync(outputPath);
    const transcribedText = response.text;
    return transcribedText;
}

async function convertAudioToMp3(audio) {
    const inputPath = `/tmp/${uuidv4()}.webm`;
    fs.writeFileSync(inputPath, audio);
    const outputPath = `/tmp/${uuidv4()}.mp3`;
    await execAsync(`ffmpeg -i ${inputPath} ${outputPath}`);
    const mp3AudioData = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    return mp3AudioData;
}


