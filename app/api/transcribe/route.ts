import { SarvamAIClient } from "sarvamai";
import { NextResponse } from 'next/server';
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

function findFirstFile(dir: string): string | null {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
         const res = findFirstFile(fullPath);
         if (res) return res;
      } else {
         return fullPath;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Helper to translate to English using Sarvam's Translate API
async function translateToEnglish(text: string, sourceLang: string): Promise<string> {
    if (!text || text.trim() === '') return '';
    try {
        const response = await fetch('https://api.sarvam.ai/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': process.env.SARVAM_API_KEY || ''
            },
            body: JSON.stringify({
                input: text.trim(),
                source_language_code: sourceLang || 'hi-IN',
                target_language_code: 'en-IN',
                speaker_gender: 'Male',
                mode: 'formal',
                model: 'sarvam-translate'
            })
        });
        const data = await response.json();
        return data.translated_text || `[Translation Placeholder for: ${text}]`;
    } catch (err) {
        console.error("Translation error:", err);
        return `[Failed to translate: ${text}]`;
    }
}

export async function POST(request: Request) {
  let audioPath = '';
  let outDir = '';

  try {
    const body = await request.json();
    const { type, language } = body;
    
    if (!process.env.SARVAM_API_KEY) {
      return NextResponse.json({ error: "Missing SARVAM_API_KEY in environment variables." }, { status: 500 })
    }

    // SCENARIO 1: We receive purely Native TEXT (E.g. Web Speech API)
    if (type === 'text') {
        const { text } = body;
        if (!text) return NextResponse.json({ error: "Missing text payload" }, { status: 400 });
        
        let translated = text;
        // If it's not english, translate it.
        if (language && !language.startsWith('en')) {
            translated = await translateToEnglish(text, language);
        }

        return NextResponse.json({ 
            result: {
               engine: 'webspeech (api passthrough)',
               native_text: text,
               english_text: translated
            } 
        });
    }

    // SCENARIO 2: We receive AUDIO that needs Sarvam STT (E.g. Sarvam Engine)
    if (type === 'audio') {
        const { audioBase64 } = body;
        if (!audioBase64) return NextResponse.json({ error: "Missing audioBase64 payload" }, { status: 400 });

        const unq = crypto.randomUUID();
        audioPath = path.join(os.tmpdir(), `${unq}.wav`);
        outDir = path.join(os.tmpdir(), `out_${unq}`);
        
        fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));

        const client = new SarvamAIClient({
          apiSubscriptionKey: process.env.SARVAM_API_KEY
        });

        const job = await client.speechToTextJob.createJob({
            model: "saaras:v3",
            languageCode: language || "unknown",
            withDiarization: true,
            numSpeakers: 2
        });

        await job.uploadFiles([audioPath]);
        await job.start();
        await job.waitUntilComplete();

        const fileResults = await job.getFileResults();
        let extractedNativeText = "";

        if (fileResults.successful.length > 0) {
            fs.mkdirSync(outDir, { recursive: true });
            await job.downloadOutputs(outDir);
            
            const extractedJsonPath = findFirstFile(outDir);
            if (extractedJsonPath) {
               const jsonRaw = fs.readFileSync(extractedJsonPath, 'utf8');
               try {
                 const parsed = JSON.parse(jsonRaw);
                 // Need to extract the actual transcript from Sarvam's output structure
                 extractedNativeText = parsed?.transcript || parsed?.text || JSON.stringify(parsed);
               } catch {
                 extractedNativeText = jsonRaw;
               }
            } else {
               extractedNativeText = "Error: No output file found";
            }
        } else {
            extractedNativeText = "Error: Batch job failed";
        }

        try {
           if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
           if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
        } catch(err) {}

        // Automatically chain the English Server Translation
        let translated = extractedNativeText;
        if (language && !language.startsWith('en') && !extractedNativeText.startsWith("Error")) {
            translated = await translateToEnglish(extractedNativeText, language);
        }

        return NextResponse.json({ 
            result: {
                engine: 'sarvam',
                native_text: extractedNativeText,
                english_text: translated
            }
        });
    }

    return NextResponse.json({ error: "Invalid type. Must be 'audio' or 'text'." }, { status: 400 });

  } catch (error: any) {
    try {
        if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        if (outDir && fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
    } catch(err) { }

    return NextResponse.json({ error: error.message || "An error occurred during transcription." }, { status: 500 })
  }
}
