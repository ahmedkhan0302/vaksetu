"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type RecorderStatus = "idle" | "recording" | "processing" | "translating" | "finished" | "error";

type Props = {
    maxDurationMs?: number;
    defaultLang?: string;
    onRecordingComplete?: (text: string) => void;
};

function clamp01(n: number) {
    return Math.max(0, Math.min(1, n));
}

const LANG_OPTIONS: Array<{ code: string; label: string }> = [
    { code: "hi-IN", label: "Hindi" },
    { code: "en-IN", label: "English" },
    { code: "bn-IN", label: "Bengali" },
    { code: "te-IN", label: "Telugu" },
    { code: "mr-IN", label: "Marathi" },
    { code: "ta-IN", label: "Tamil" },
    { code: "ur-IN", label: "Urdu" },
    { code: "gu-IN", label: "Gujarati" },
    { code: "kn-IN", label: "Kannada" },
    { code: "ml-IN", label: "Malayalam" },
    { code: "od-IN", label: "Odia" },
    { code: "pa-IN", label: "Punjabi" },
    { code: "as-IN", label: "Assamese" },
    { code: "brx-IN", label: "Bodo" },
    { code: "doi-IN", label: "Dogri" },
    { code: "ks-IN", label: "Kashmiri" },
    { code: "kok-IN", label: "Konkani" },
    { code: "mai-IN", label: "Maithili" },
    { code: "mni-IN", label: "Manipuri" },
    { code: "ne-IN", label: "Nepali" },
    { code: "sa-IN", label: "Sanskrit" },
    { code: "sat-IN", label: "Santali" },
    { code: "sd-IN", label: "Sindhi" },
];

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            // Extract pure base64 characters from data URI: data:audio/webm;base64,xxxxxxxx...
            const base64 = dataUrl.split(",")[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export function AudioRecorderCard({ maxDurationMs = 10000, defaultLang = "hi-IN", onRecordingComplete }: Props) {
    const [lang, setLang] = useState<string>(defaultLang);

    const [status, setStatus] = useState<RecorderStatus>("idle");
    const [error, setError] = useState<string>("");
    const [remainingMs, setRemainingMs] = useState<number>(maxDurationMs);

    const [audioUrl, setAudioUrl] = useState<string>("");
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const [level, setLevel] = useState<number>(0);
    const [bars, setBars] = useState<number[]>(() => Array.from({ length: 24 }, () => 0));
    
    const [nativeTranscript, setNativeTranscript] = useState<string>("");
    const [englishTranscript, setEnglishTranscript] = useState<string>("");

    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const stopTimerRef = useRef<number | null>(null);
    const tickTimerRef = useRef<number | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const rafRef = useRef<number | null>(null);

    const canRecord = useMemo(() => {
        return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    }, []);

    const cleanupTimers = () => {
        if (stopTimerRef.current !== null) {
            window.clearTimeout(stopTimerRef.current);
            stopTimerRef.current = null;
        }
        if (tickTimerRef.current !== null) {
            window.clearInterval(tickTimerRef.current);
            tickTimerRef.current = null;
        }
    };

    const cleanupAnalysis = () => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        analyserRef.current?.disconnect();
        sourceNodeRef.current?.disconnect();
        analyserRef.current = null;
        sourceNodeRef.current = null;

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
    };

    const cleanupStream = () => {
        if (streamRef.current) {
            for (const track of streamRef.current.getTracks()) track.stop();
            streamRef.current = null;
        }
    };

    const resetOutput = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl("");
        setAudioBlob(null);
        setNativeTranscript("");
        setEnglishTranscript("");
    };

    const processAudioFile = async (blob: Blob) => {
        setStatus("processing");
        try {
            const base64 = await blobToBase64(blob);
            
            // Step 1: STT Native Extraction
            const response = await fetch("/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "audio", audioBase64: base64, language: lang }),
            });

            if (!response.ok) {
                const resText = await response.text();
                throw new Error(`Failed to process audio: ${resText}`);
            }

            const data = await response.json();
            const nativeTextData = data.result?.native_text || "";
            setNativeTranscript(nativeTextData);
            
            // Step 2: Translation Extraction
            setStatus("translating");
            
            if (lang !== "en-IN" && !nativeTextData.startsWith("Error")) {
               const trResponse = await fetch("/api/transcribe", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ type: "text", text: nativeTextData, language: lang }),
               });
               
               if (trResponse.ok) {
                   const trData = await trResponse.json();
                   const translatedText = trData.result?.english_text || "";
                   setEnglishTranscript(translatedText);
                   setStatus("finished");
                   if (onRecordingComplete) onRecordingComplete(translatedText);
               } else {
                   setEnglishTranscript(`[Server Error]`);
                   setStatus("finished");
               }
            } else {
               setEnglishTranscript(nativeTextData);
               setStatus("finished");
               if (onRecordingComplete) onRecordingComplete(nativeTextData);
            }
        } catch (err: any) {
            setStatus("error");
            setError(err.message || "An error occurred fetching transcription.");
        }
    };

    const stop = () => {
        cleanupTimers();

        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
        } else {
            cleanupAnalysis();
            cleanupStream();
            setStatus((s) => (s === "recording" ? "finished" : s));
        }
    };

    const start = async () => {
        setError("");
        resetOutput();
        setRemainingMs(maxDurationMs);

        if (!canRecord) {
            setStatus("error");
            setError("Recording not supported in this browser.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
                video: false,
            });

            streamRef.current = stream;

            const AudioCtx =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

            if (!AudioCtx) throw new Error("AudioContext not supported.");

            const ctx = new AudioCtx();
            audioContextRef.current = ctx;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            analyserRef.current = analyser;

            const source = ctx.createMediaStreamSource(stream);
            sourceNodeRef.current = source;
            source.connect(analyser);

            const timeData = new Float32Array(analyser.fftSize);

            const pump = () => {
                const a = analyserRef.current;
                if (!a) return;

                a.getFloatTimeDomainData(timeData);

                let sumSq = 0;
                for (let i = 0; i < timeData.length; i++) sumSq += timeData[i] * timeData[i];
                const rms = Math.sqrt(sumSq / timeData.length);
                const normalized = clamp01(rms * 3.2);

                setLevel(normalized);
                setBars((prev) => {
                    const next = prev.slice(1);
                    next.push(normalized);
                    return next;
                });

                rafRef.current = requestAnimationFrame(pump);
            };
            pump();

            const mimeTypeCandidates = [
                "audio/webm;codecs=opus",
                "audio/webm",
                "audio/ogg;codecs=opus",
                "audio/ogg",
            ];
            const mimeType = mimeTypeCandidates.find((t) => MediaRecorder.isTypeSupported(t));

            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            recorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (ev: BlobEvent) => {
                if (ev.data.size > 0) chunksRef.current.push(ev.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);

                cleanupAnalysis();
                cleanupStream();
                
                // Fire Server Processing Proxy
                processAudioFile(blob);
            };

            recorder.onerror = () => {
                cleanupAnalysis();
                cleanupStream();
                setStatus("error");
                setError("Recorder error occurred.");
            };

            recorder.start(250);
            setStatus("recording");

            stopTimerRef.current = window.setTimeout(() => stop(), maxDurationMs);

            const startAt = Date.now();
            tickTimerRef.current = window.setInterval(() => {
                const elapsed = Date.now() - startAt;
                const left = Math.max(0, maxDurationMs - elapsed);
                setRemainingMs(left);
                if (left <= 0) cleanupTimers();
            }, 100);
        } catch (e) {
            cleanupTimers();
            cleanupAnalysis();
            cleanupStream();
            setStatus("error");
            setError(e instanceof Error ? e.message : "Microphone permission denied or unavailable.");
        }
    };

    // Note: Removed the buggy 'transcript' React hook dependency since completion triggers internally in processAudioFile natively now
    useEffect(() => {
        return () => {
            cleanupTimers();
            cleanupAnalysis();
            cleanupStream();
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const secondsLeft = Math.ceil(remainingMs / 1000);

    const statusPill =
        status === "recording" ? (
            <span className="inline-flex items-center rounded-full border border-green-600/40 bg-green-600/10 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
        Recording
      </span>
        ) : (status === "processing" || status === "translating") ? (
            <span className="inline-flex items-center rounded-full border border-amber-600/40 bg-amber-600/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
        Processing
      </span>
        ) : status === "finished" ? (
            <span className="inline-flex items-center rounded-full border border-green-600/30 bg-green-600/5 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
        Transcribed
      </span>
        ) : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {statusPill}
                    <span>
            {status === "recording"
                ? `Recording… (${secondsLeft}s left)`
                : ""}
          </span>
                </div>

                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        Language
                        <select
                            value={lang}
                            onChange={(e) => setLang(e.target.value)}
                            disabled={status === "recording" || status === "processing" || status === "translating"}
                            className="h-9 rounded-md border border-green-600/40 bg-background px-2 text-sm text-foreground focus:border-green-600 focus:ring-2 focus:ring-green-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {LANG_OPTIONS.map((opt) => (
                                <option key={opt.code} value={opt.code}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {status === "idle" || status === "finished" || status === "error" ? (
                        <button
                            type="button"
                            onClick={start}
                            disabled={!canRecord}
                            className="h-9 rounded-md border border-green-600 bg-green-600/10 px-3 text-sm font-medium text-green-700 hover:bg-green-600/15 focus:ring-2 focus:ring-green-600/25 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400"
                        >
                            Record
                        </button>
                    ) : status === "recording" ? (
                        <button
                            type="button"
                            onClick={stop}
                            className="h-9 rounded-md border border-green-600 bg-background px-3 text-sm text-foreground hover:bg-green-600/10"
                        >
                            Stop
                        </button>
                    ) : (
                         <button
                            type="button"
                            disabled
                            className="h-9 flex items-center justify-center rounded-md border border-amber-600 bg-amber-600/10 px-3 text-sm font-medium text-amber-700 opacity-50 cursor-not-allowed"
                        >
                            Wait...
                        </button>
                    )}
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Initial Blank State (Optional placeholder) */}
            {status === "idle" && !error && (
                <div className="rounded-lg bg-muted/20 p-8 flex flex-col items-center justify-center border border-dashed border-border/50 text-muted-foreground">
                    <p className="text-sm">Click Record to start capturing speech securely</p>
                </div>
            )}

            {/* Live Recording Phase: Loudness meter */}
            {status === "recording" && (
                <div className="rounded-lg bg-muted/40 p-4 animate-in fade-in zoom-in duration-300">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Input level</p>
                        <p className="text-xs text-muted-foreground">
                            {`${Math.round(level * 100)}%`}
                        </p>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full bg-green-600/70 transition-[width] duration-100"
                            style={{ width: `${Math.round(level * 100)}%` }}
                        />
                    </div>
                    <div className="mt-3 flex h-10 items-end gap-1">
                        {bars.map((b, idx) => (
                            <div
                                key={idx}
                                className="w-full rounded-sm bg-green-600/50"
                                style={{ height: `${Math.max(3, Math.round(b * 40))}px` }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Processing State */}
            {status === "processing" && (
                <div className="rounded-lg bg-muted/20 p-8 flex flex-col items-center justify-center border border-dashed border-amber-600/30 text-amber-600/80 space-y-3 animate-in fade-in zoom-in">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                    <p className="text-sm">Batching audio block through Sarvam AI...</p>
                </div>
            )}

            {/* Translating / Finished Phase */}
            {(status === "translating" || status === "finished") && (
                <div className="rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-600/30 p-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-3">
                        <div>
                             <p className="text-xs text-muted-foreground mb-1">Native Input:</p>
                             <p className="text-sm text-foreground bg-background rounded border p-2">{nativeTranscript || "No speech detected."}</p>
                        </div>
                        <div>
                             <p className="text-xs text-muted-foreground mb-1">English Translation:</p>
                             {status === "translating" ? (
                                <div className="text-sm text-amber-600 bg-amber-50/50 rounded border border-amber-200/50 p-2 flex items-center gap-2">
                                     <Loader2 className="h-4 w-4 animate-spin" />
                                     Translating to English...
                                </div>
                             ) : (
                                <p className="text-sm text-foreground bg-green-100/50 dark:bg-green-950/50 rounded border border-green-200/50 dark:border-green-800 p-2 font-medium">{englishTranscript || "Translation failed."}</p>
                             )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}