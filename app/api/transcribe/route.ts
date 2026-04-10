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

export async function POST(request: Request) {
  let audioPath = '';
  let outDir = '';

  try {
    const { audioBase64, language } = await request.json();
    
    if (!process.env.SARVAM_API_KEY) {
      return NextResponse.json({ error: "Missing SARVAM_API_KEY in environment variables." }, { status: 500 })
    }

    const unq = crypto.randomUUID();
    audioPath = path.join(os.tmpdir(), `${unq}.wav`);
    outDir = path.join(os.tmpdir(), `out_${unq}`);
    
    console.log(`[Batch Transcribe] Received request for lang ${language}, writing to ${audioPath}...`);
    fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));

    const client = new SarvamAIClient({
      apiSubscriptionKey: process.env.SARVAM_API_KEY
    });

    console.log(`[Batch Transcribe] API Key present, creating job with model saaras:v3...`);
    const job = await client.speechToTextJob.createJob({
        model: "saaras:v3",
        languageCode: language || "unknown",
        withDiarization: true,
        numSpeakers: 2
    });

    console.log(`[Batch Transcribe] Job created, uploading files...`);
    await job.uploadFiles([audioPath]);
    
    console.log(`[Batch Transcribe] Files uploaded, starting job...`);
    await job.start();
    
    console.log(`[Batch Transcribe] Waiting until complete...`);
    await job.waitUntilComplete();

    console.log(`[Batch Transcribe] Job complete. Fetching results...`);
    const fileResults = await job.getFileResults();
    let finalPayload: any = null;

    if (fileResults.successful.length > 0) {
        fs.mkdirSync(outDir, { recursive: true });
        console.log(`[Batch Transcribe] Downloading outputs to ${outDir}...`);
        await job.downloadOutputs(outDir);
        
        const extractedJsonPath = findFirstFile(outDir);
        if (extractedJsonPath) {
           console.log(`[Batch Transcribe] Found output file: ${extractedJsonPath}`);
           const jsonRaw = fs.readFileSync(extractedJsonPath, 'utf8');
           try {
             finalPayload = JSON.parse(jsonRaw);
           } catch {
             finalPayload = jsonRaw; // Maybe it's raw text
           }
        } else {
           console.warn(`[Batch Transcribe] No output file found inside downloaded directory.`);
           finalPayload = { error: "No output file found inside downloaded output directory." };
        }
    } else {
        console.error(`[Batch Transcribe] Batch job failed details:`, fileResults.failed);
        finalPayload = { error: "Batch job failed", details: fileResults.failed };
    }

    try {
       if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
       if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
    } catch(err) {
       console.error("Cleanup error", err);
    }

    // Send the entire JSON enclosed in result
    console.log(`[Batch Transcribe] Sending final payload.`);
    return NextResponse.json({ result: finalPayload });
  } catch (error: any) {
    try {
        if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        if (outDir && fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
    } catch(err) { }

    return NextResponse.json({ error: error.message || "An error occurred during transcription." }, { status: 500 })
  }
}
