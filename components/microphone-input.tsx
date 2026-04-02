"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type RecorderStatus = "idle" | "recording" | "finished" | "error";

type Props = {
    maxDurationMs?: number;
    defaultLang?: string;
};

function clamp01(n: number) {
    return Math.max(0, Math.min(1, n));
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
    const w = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const LANG_OPTIONS: Array<{ code: string; label: string }> = [
    { code: "en-US", label: "English" },
    { code: "hi-IN", label: "Hindi" },
    { code: "mr-IN", label: "Marathi" },
    { code: "te-IN", label: "Telugu" },
    { code: "kn-IN", label: "Kannada" },
    { code: "ur-IN", label: "Urdu" },
    { code: "or-IN", label: "Odia" },
];

export function AudioRecorderCard({ maxDurationMs = 10000, defaultLang = "en-US" }: Props) {
    const [lang, setLang] = useState<string>(defaultLang);

    const [status, setStatus] = useState<RecorderStatus>("idle");
    const [error, setError] = useState<string>("");
    const [remainingMs, setRemainingMs] = useState<number>(maxDurationMs);

    const [audioUrl, setAudioUrl] = useState<string>("");
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const [level, setLevel] = useState<number>(0);
    const [bars, setBars] = useState<number[]>(() => Array.from({ length: 24 }, () => 0));
    const [transcript, setTranscript] = useState<string>("");

    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const stopTimerRef = useRef<number | null>(null);
    const tickTimerRef = useRef<number | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const rafRef = useRef<number | null>(null);

    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const canRecord = useMemo(() => {
        return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    }, []);

    const canTranscribe = useMemo(() => {
        if (typeof window === "undefined") return false;
        return getSpeechRecognitionConstructor() !== null;
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

    const cleanupRecognition = () => {
        const r = recognitionRef.current;
        if (!r) return;
        try {
            r.stop();
        } catch {}
        recognitionRef.current = null;
    };

    const resetOutput = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl("");
        setAudioBlob(null);
        setTranscript("");
    };

    const stop = () => {
        cleanupTimers();
        cleanupRecognition();

        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
        } else {
            cleanupAnalysis();
            cleanupStream();
            setStatus((s) => (s === "recording" ? "finished" : s));
        }
    };

    const startRecognition = () => {
        if (!canTranscribe) return;

        const Ctor = getSpeechRecognitionConstructor();
        if (!Ctor) return;

        const recognition = new Ctor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalText = "";
            let interimText = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0]?.transcript ?? "";
                if (result.isFinal) finalText += text;
                else interimText += text;
            }

            setTranscript(`${finalText} ${interimText}`.trim());
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch {}
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
                setStatus("finished");
            };

            recorder.onerror = () => {
                cleanupAnalysis();
                cleanupStream();
                setStatus("error");
                setError("Recorder error occurred.");
            };

            startRecognition();

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
            cleanupRecognition();
            cleanupAnalysis();
            cleanupStream();
            setStatus("error");
            setError(e instanceof Error ? e.message : "Microphone permission denied or unavailable.");
        }
    };

    useEffect(() => {
        return () => {
            cleanupTimers();
            cleanupRecognition();
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
        ) : status === "finished" ? (
            <span className="inline-flex items-center rounded-full border border-green-600/30 bg-green-600/5 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
        Saved
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
                            disabled={status === "recording"}
                            className="h-9 rounded-md border border-green-600/40 bg-background px-3 text-sm text-foreground focus:border-green-600 focus:ring-2 focus:ring-green-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {LANG_OPTIONS.map((opt) => (
                                <option key={opt.code} value={opt.code}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {status !== "recording" ? (
                        <button
                            type="button"
                            onClick={start}
                            disabled={!canRecord}
                            className="h-9 rounded-md border border-green-600 bg-green-600/10 px-3 text-sm font-medium text-green-700 hover:bg-green-600/15 focus:ring-2 focus:ring-green-600/25 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400"
                        >
                            Record
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={stop}
                            className="h-9 rounded-md border border-green-600 bg-background px-3 text-sm text-foreground hover:bg-green-600/10"
                        >
                            Stop
                        </button>
                    )}
                </div>
            </div>

            {/* Loudness meter + bars */}
            <div className="rounded-lg bg-muted/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Input level</p>
                    <p className="text-xs text-muted-foreground">
                        {status === "recording" ? `${Math.round(level * 100)}%` : "—"}
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

            {/* Transcript */}
            <div className="rounded-lg bg-muted/40 p-4">
                <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Live transcript</p>

                    <span
                        className={[
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            canTranscribe
                                ? "border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-400"
                                : "border-border bg-background text-muted-foreground",
                        ].join(" ")}
                    >
            {canTranscribe ? "Web Speech API" : "Not supported"}
          </span>
                </div>

                <p className="text-sm text-foreground">{transcript || "—"}</p>
            </div>

            {/* Playback */}
            <div className="rounded-lg bg-muted/40 p-4">
                <p className="mb-2 text-xs text-muted-foreground">Recorded audio</p>
                {status === "error" ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : audioUrl ? (
                    <audio controls src={audioUrl} className="w-full" />
                ) : (
                    <p className="text-sm text-muted-foreground">No recording yet.</p>
                )}
                {audioBlob ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Size: {(audioBlob.size / 1024).toFixed(1)} KB Type: {audioBlob.type || "unknown"}
                    </p>
                ) : null}
            </div>
        </div>
    );
}