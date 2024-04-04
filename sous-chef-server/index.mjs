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
app.use(express.json({ limit: '50mb' }));
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

app.post('/textToResponse', async (req, res) => {
    const { text, recipe, conversation } = req.body;
    try {
        const messages = [
            {
                role: 'system',
                content: `You are a helpful assistant who is assisting a user with a recipe. 
                The user is asking for help with a recipe, and your role is to give them whatever 
                help they need and be concise and friendly as you do it. 
                The recipe is as follows: ${recipe} .`
            }
        ];
        if (conversation) {
            for (const message of conversation) {
                messages.push(message);
            }
        }
        messages.push(
            {
                role: 'user',
                content: text
            }
        );
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: messages,
        });
        if (completion.choices && completion.choices.length > 0) {
            const content = completion.choices[0].message.content;
            return res.status(200).json({ text: content });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: `Could not respond to message: ${error}` });
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


