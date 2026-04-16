# Speech-to-Text (STT) Architecture Comparison

This document explores the differences, inputs, and outputs of the current STT implementations (Web Speech API vs. Sarvam AI) within the project, alongside the architectural strategy for integrating English translation, FastAPI mapping, and UI decoupling.

## 1. Web Speech API (Current Implementation)

The Web Speech API is built directly into modern web browsers (e.g., Chrome). 

### How it currently works
- **Input:** The browser handles microphone authorization and audio stream hijacking autonomously behind the scenes. We supply a configuration object (e.g., `recognition.lang = 'hi-IN'`).
- **Output:** Triggers real-time Javascript event callbacks (`onresult`). It outputs an interim and a final `transcript` string exclusively natively computed by the browser. 
- **Storage:** Currently, it only dumps the string into a temporary React `useState()`.
- **The Catch for Our Use-Case:** If a user speaks in Hindi (`hi-IN`), Web Speech will transcribe and output text exclusively in Devanagari script (e.g. `क्या हाल है`). It does **not** translate this into English natively.

## 2. Sarvam AI API (Batch / Streaming)

Sarvam provides highly specialized localized models tailored directly to Indian languages. 

### How the snippet provided works
- **Input:** It demands raw audio data bytes. Specifically, a 16kHz Base64-encoded WAV buffer. Our Next.js client manually captures audio chunks, utilizes an AudioContext to normalize the sample rate to 16,000, packages them into a WAV envelope, and pushes them to a WebSocket OR a REST API endpoint.
- **Output:** Highly accurate JSON returning transcribed native strings. 
- **Storage:** Currently, like WebSpeech, we simply `setState` the raw JSON onto the frontend view. 

---

## 3. The Future Architecture: English Storage vs. Native UI

To achieve your goal of taking native speech, displaying native text in the UI, but pushing explicitly English text to FastAPI to fetch mapping glosses:

### Translation Requirement
Neither baseline STT module natively gives you both Native script AND English script simultaneously without translation models. 
1. **The Translation Pipeline:** Once STT produces the native text (e.g., Hindi), we must bounce that native text through a Translation API (like Sarvam's `translate-text` API) to convert it to English. 
2. **The Output Object:** The backend should respond to the frontend with a structured object:
   ```json
   {
       "native_text": "नमस्ते दुनिया",
       "english_text": "Hello world"
   }
   ```

### Abstracted Component Pipeline

Currently, all the logic (Mic capture, WAV encoding, STT API calls, UI rendering) is jammed into one monolithic page `app/(protected)/explore/transcribe/page.tsx`. To fix this using good design practice, we will break the ecosystem into atomic, separated services:

#### A. Service Layer (Logic & Network)
- **`lib/audio/useAudioRecorder.ts`**: A pure React hook handling MediaRecorder capturing and returning raw audio blobs. It knows nothing about UI.
- **`lib/api/transcription.ts`**: Pure async functions (`transcribeWithSarvam`, `transcribeWithWebSpeech`) that take an audio blob and return the structured JSON string.
- **`lib/api/fastapi.ts`**: Fetches the array of glosses when passed an English string. 

#### B. Component Layer (UI & Visuals)
- **`<MicrophoneButton />`**: Only responsible for showing recording UI interactions cleanly.
- **`<TranscribedScriptViewer lang="hi-IN" />`**: Specifically reads the `native_text` returned from the service to show the user their text.
- **`<GlossPlayer glosses={["HELLO", "WORLD"]} />`**: A decoupled UI carousel that fetches the respective mapped video assets from `/public/videos/assets/` and plays them in sequence.

## 4. Final Data Flow Diagram

```text
[User Speaks Hindi] 
       ↓ (<MicrophoneButton /> via hook)
[WAV Blob Generated]
       ↓ (POST to Next.js API Proxy)
[Sarvam STT / Translation API Chain]
       ↓
[Returns Native & English Strings to Frontend]
       ↓
[Frontend Saves to Database -> `supabase.from('transcripts').insert(...)`]
       ↓
[English String sent via POST to Python FastAPI]
       ↓
[FastAPI returns Array of Gloss Strings] e.g., ["HELLO", "WORLD"]
       ↓
[Frontend mounts `<GlossPlayer glosses={...} />`]
       ↓
[Searches static video assets and plays consecutively]
```
