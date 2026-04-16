import * as React from 'react';

export type STTEngine = 'sarvam' | 'webspeech';

export type TranscriptionResult = {
    native_text: string;
    english_text?: string;
    raw_payload?: any;
};

// WAV encoding helper
function encodeWAV(samples: Float32Array, sampleRate = 16000) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    // ... write WAV headers
    const writeString = (v: DataView, offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            v.setUint8(offset + i, str.charCodeAt(i));
        }
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

export function useTranscription(engine: STTEngine, language: string, maxDurationMs: number = 20000) {
    const [isRecording, setIsRecording] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [result, setResult] = React.useState<TranscriptionResult | null>(null);
    const [timeRemainingMs, setTimeRemainingMs] = React.useState<number>(maxDurationMs);

    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const chunksRef = React.useRef<Blob[]>([]);
    const recognitionRef = React.useRef<any>(null);
    
    // We accumulate Web Speech internal transcripts here secretly 
    // so we don't display it to the user until they press STOP.
    const internalWebSpeechStringRef = React.useRef<string>('');

    // Timer refs
    const timerIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

    const clearTimers = () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    };

    const startRecording = async () => {
        setError(null);
        setResult(null);
        internalWebSpeechStringRef.current = '';
        setTimeRemainingMs(maxDurationMs);
        setIsRecording(true);

        const startTime = Date.now();
        
        const forceStopIfTimeExceeded = () => {
            const passed = Date.now() - startTime;
            const remaining = Math.max(0, maxDurationMs - passed);
            setTimeRemainingMs(remaining);
            if (remaining <= 0) {
                 clearTimers();
                 stopRecordingRef.current(); // Calls the latest stop recording function
            }
        };

        timerIntervalRef.current = setInterval(forceStopIfTimeExceeded, 100);

        if (engine === 'webspeech') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setError("Your browser does not support Web Speech API.");
                setIsRecording(false);
                clearTimers();
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language === 'unknown' ? 'en-US' : language;

            recognition.onresult = (event: any) => {
                let currentFinal = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        currentFinal += event.results[i][0].transcript;
                    }
                }
                if (currentFinal) {
                    internalWebSpeechStringRef.current += currentFinal + " ";
                }
            };

            recognition.onerror = (event: any) => {
                setError(`Web Speech error: ${event.error}`);
                setIsRecording(false);
                clearTimers();
            };

            try {
                recognition.start();
                recognitionRef.current = recognition;
            } catch (e: any) {
                setError(e.message);
                setIsRecording(false);
                clearTimers();
            }
            return;
        }

        // Sarvam Engine Audio Capture
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            mr.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            mr.onstop = processSarvamAudio;
            chunksRef.current = [];
            mr.start();
            mediaRecorderRef.current = mr;
        } catch (err: any) {
            setError("Could not access microphone.");
            setIsRecording(false);
            clearTimers();
        }
    };

    const stopRecording = async () => {
        setIsRecording(false);
        clearTimers();

        if (engine === 'webspeech') {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            // Once they stop, we process the secretly collected text!
            const textToProcess = internalWebSpeechStringRef.current.trim();
            
            if (textToProcess) {
                setIsProcessing(true);
                try {
                    const response = await fetch('/api/transcribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'text', text: textToProcess, language })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || "Server error");
                    setResult(data.result);
                } catch(e: any) {
                    setError(e.message);
                } finally {
                    setIsProcessing(false);
                }
            } else {
                 setError("No voice detected by WebSpeech.");
            }
            return;
        }

        // If Sarvam
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
    };

    // Keep a ref to the latest stopRecording so our timer can call it safely
    const stopRecordingRef = React.useRef(stopRecording);
    React.useEffect(() => {
        stopRecordingRef.current = stopRecording;
    }, [stopRecording]);

    // Cleanup intervals on unmount securely
    React.useEffect(() => {
        return () => clearTimers();
    }, []);

    const processSarvamAudio = async () => {
        setIsProcessing(true);
        try {
            const blob = new Blob(chunksRef.current);
            const arrayBuffer = await blob.arrayBuffer();

            const actx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const audioBuffer = await actx.decodeAudioData(arrayBuffer);

            const float32Array = audioBuffer.getChannelData(0);
            const wavBuffer = encodeWAV(float32Array, 16000);

            let binary = '';
            const bytes = new Uint8Array(wavBuffer);
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64Audio = window.btoa(binary);

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'audio', audioBase64: base64Audio, language })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Server error");
            }

            setResult(data.result);
        } catch (err: any) {
            setError(err.message || "An error occurred fetching transcription.");
        } finally {
            setIsProcessing(false);
        }
    };

    return { 
        startRecording, 
        stopRecording, 
        isRecording, 
        isProcessing, 
        error, 
        result, 
        timeRemainingMs 
    };
}
