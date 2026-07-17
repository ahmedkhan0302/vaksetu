import { useState, useRef, useCallback, useEffect } from "react";
import { MediaPipeManager } from "@/lib/mediapipe/mediapipe-manager";
import { FeatureNormalizer } from "@/lib/mediapipe/feature-normalizer";
import { drawSkeletonOverlay } from "@/lib/mediapipe/skeleton-renderer";
import { TranslationState, RawFrameLandmarks, Landmark } from "@/lib/mediapipe/types";

const DEFAULT_WS_URL_PYGRU = process.env.NEXT_PUBLIC_SIGN_API_WS_URL || "ws://127.0.0.1:8000/ws/translate";
const DEFAULT_HTTP_URL_PYGRU = process.env.NEXT_PUBLIC_SIGN_API_HTTP_URL || "http://127.0.0.1:8000";

const DEFAULT_WS_URL_CTC = process.env.NEXT_PUBLIC_CTC_API_WS_URL || "ws://127.0.0.1:8001/ws/ctc";
const DEFAULT_HTTP_URL_CTC = process.env.NEXT_PUBLIC_CTC_API_HTTP_URL || "http://127.0.0.1:8001";

/**
 * Extracts raw landmarks and flattens them into the 288-dimensional vector expected by the CTC backend.
 */
function extractCTCFeatures(raw: RawFrameLandmarks): number[] {
    const poseArr = new Array<number>(33 * 4).fill(0.0);
    if (raw.pose && raw.pose.length === 33) {
        for (let i = 0; i < 33; i++) {
            const pt = raw.pose[i];
            poseArr[i * 4] = pt.x;
            poseArr[i * 4 + 1] = pt.y;
            poseArr[i * 4 + 2] = pt.z;
            poseArr[i * 4 + 3] = pt.visibility ?? 0.0;
        }
    }

    const lhArr = new Array<number>(21 * 3).fill(0.0);
    if (raw.left_hand && raw.left_hand.length === 21) {
        for (let i = 0; i < 21; i++) {
            const pt = raw.left_hand[i];
            lhArr[i * 3] = pt.x;
            lhArr[i * 3 + 1] = pt.y;
            lhArr[i * 3 + 2] = pt.z;
        }
    }

    const rhArr = new Array<number>(21 * 3).fill(0.0);
    if (raw.right_hand && raw.right_hand.length === 21) {
        for (let i = 0; i < 21; i++) {
            const pt = raw.right_hand[i];
            rhArr[i * 3] = pt.x;
            rhArr[i * 3 + 1] = pt.y;
            rhArr[i * 3 + 2] = pt.z;
        }
    }

    const FACE_KEY_INDICES = [152, 234, 454, 93, 323, 4, 10, 61, 291, 13];
    const faceArr = new Array<number>(10 * 3).fill(0.0);
    if (raw.face && raw.face.length > 0) {
        for (let i = 0; i < 10; i++) {
            const idx = FACE_KEY_INDICES[i];
            if (raw.face[idx]) {
                const pt = raw.face[idx];
                faceArr[i * 3] = pt.x;
                faceArr[i * 3 + 1] = pt.y;
                faceArr[i * 3 + 2] = pt.z;
            }
        }
    }

    return [...poseArr, ...lhArr, ...rhArr, ...faceArr];
}

/**
 * Horizontally mirrors raw MediaPipe landmarks (flips X coordinates and swaps left/right joints/hands)
 * to align the un-mirrored webcam input with the mirrored training pipeline of the CTC model.
 */
function mirrorRawLandmarks(raw: RawFrameLandmarks): RawFrameLandmarks {
    const flipX = (pts: Landmark[] | null) => {
        if (!pts) return null;
        return pts.map((pt) => ({
            ...pt,
            x: 1.0 - pt.x,
        }));
    };

    // Swap hands and flip X coordinates
    const left_hand = flipX(raw.right_hand);
    const right_hand = flipX(raw.left_hand);

    // Flip X coordinates for face and swap symmetric left/right landmarks
    const face = flipX(raw.face);
    if (face) {
        const faceSwaps = [
            [234, 454], // Left/Right Cheeks
            [93, 323],   // Left/Right Eye/Jaw boundaries
            [61, 291],   // Left/Right Mouth corners
        ];
        for (const [i1, i2] of faceSwaps) {
            if (face[i1] && face[i2]) {
                const temp = face[i1];
                face[i1] = face[i2];
                face[i2] = temp;
            }
        }
    }

    // Flip X coordinates for pose and swap left/right joint indices
    let pose = null;
    if (raw.pose) {
        pose = flipX(raw.pose);
        if (pose) {
            const poseSwaps = [
                [1, 4], [2, 5], [3, 6], // Eyes inner/middle/outer
                [7, 8],                 // Ears
                [9, 10],                // Mouth corners
                [11, 12],               // Shoulders
                [13, 14],               // Elbows
                [15, 16],               // Wrists
                [17, 18],               // Pinkies
                [19, 20],               // Index fingers
                [21, 22],               // Thumbs
                [23, 24],               // Hips
                [25, 26],               // Knees
                [27, 28],               // Ankles
                [29, 30],               // Heels
                [31, 32]                // Feet/toes
            ];
            for (const [i1, i2] of poseSwaps) {
                const temp = pose[i1];
                pose[i1] = pose[i2];
                pose[i2] = temp;
            }
        }
    }

    return {
        left_hand,
        right_hand,
        face,
        pose,
    };
}

export function useSignStream(modelType: "pygru" | "ctc" = "pygru") {
    const [translationState, setTranslationState] = useState<TranslationState>("IDLE");
    const [detectedGlosses, setDetectedGlosses] = useState<string[]>([]);
    const [recognizedEnglish, setRecognizedEnglish] = useState<string>("");
    const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const mediaPipeRef = useRef<MediaPipeManager | null>(null);
    const normalizerRef = useRef<FeatureNormalizer | null>(null);
    const animFrameIdRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const detectedGlossesRef = useRef<string[]>([]);

    const frameBufferRef = useRef<number[][]>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const wsUrl = modelType === "ctc" ? DEFAULT_WS_URL_CTC : DEFAULT_WS_URL_PYGRU;
    const httpUrl = modelType === "ctc" ? DEFAULT_HTTP_URL_CTC : DEFAULT_HTTP_URL_PYGRU;

    // Keep ref in sync with state for access in callbacks
    useEffect(() => {
        detectedGlossesRef.current = detectedGlosses;
    }, [detectedGlosses]);

    // Initialize MediaPipe & Normalizer on demand
    const getMediaPipe = useCallback(() => {
        if (!mediaPipeRef.current) {
            mediaPipeRef.current = new MediaPipeManager();
        }
        return mediaPipeRef.current;
    }, []);

    const getNormalizer = useCallback(() => {
        if (!normalizerRef.current) {
            normalizerRef.current = new FeatureNormalizer();
        }
        return normalizerRef.current;
    }, []);

    // Perform health check API verification before connecting WebSocket
    const checkBackendHealth = async (): Promise<boolean> => {
        try {
            const healthEndpoint = modelType === "ctc" ? `${httpUrl}/api/health` : `${httpUrl}/health`;
            console.log(`[useSignStream] Checking backend health at ${healthEndpoint} ...`);
            const res = await fetch(healthEndpoint);
            if (!res.ok) {
                console.warn("[useSignStream] Health check HTTP response not OK:", res.status);
                return false;
            }
            const data = await res.json();
            console.log("[useSignStream] Backend health response:", data);
            
            if (modelType === "ctc") {
                return data.status === "healthy" && data.model_loaded === true;
            } else {
                return data.status === "healthy" && data.schema_version === "1.0" && data.feature_dimension === 506;
            }
        } catch (e) {
            console.warn("[useSignStream] Health check request error:", e);
            return false;
        }
    };

    // Trigger feature validation call (POST /validate_features via Next.js API proxy)
    const validateFeaturesWithBackend = async (video: HTMLVideoElement) => {
        try {
            console.log("[useSignStream] Initiating feature validation sample frame...");
            const mp = getMediaPipe();
            const normalizer = getNormalizer();

            const raw = mp.processVideoFrame(video, performance.now());
            const mirroredRaw = mirrorRawLandmarks(raw);
            const fullFeatures = normalizer.normalizeFrame(mirroredRaw);
            const payload = normalizer.formatValidationPayload(mirroredRaw, fullFeatures);

            console.log("[useSignStream] Sending feature validation request payload...", payload);

            const res = await fetch("/api/sign-to-text/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            console.log("[useSignStream] Feature validation response returned:", data);
        } catch (e) {
            console.warn("[useSignStream] Feature validation call encountered error:", e);
        }
    };

    // LLM synthesis helper calling server API route
    const synthesizeSentence = async (words: string[]) => {
        console.log("[useSignStream] Triggering LLM synthesis for words:", words);
        if (!words || words.length === 0) {
            setRecognizedEnglish("");
            return;
        }

        setIsSynthesizing(true);
        try {
            const res = await fetch("/api/sign-to-text/synthesize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ words })
            });
            const data = await res.json();
            console.log("[useSignStream] LLM synthesis API response:", data);
            if (res.ok && data.sentence) {
                setRecognizedEnglish(data.sentence);
            } else {
                setRecognizedEnglish(words.join(" "));
            }
        } catch (e) {
            console.error("[useSignStream] LLM synthesis call failed:", e);
            setRecognizedEnglish(words.join(" "));
        } finally {
            setIsSynthesizing(false);
        }
    };

    // Stop active stream and synthesize
    const stopTranslation = useCallback(async () => {
        if (modelType === "ctc") {
            console.log("[useSignStream] Stopping CTC recording. Total frames captured:", frameBufferRef.current.length);
            
            if (animFrameIdRef.current) {
                cancelAnimationFrame(animFrameIdRef.current);
                animFrameIdRef.current = null;
            }

            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext("2d");
                ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }

            if (frameBufferRef.current.length < 10) {
                setErrorMessage("Sequence too short. Please record for longer.");
                setTranslationState("ERROR");
                return;
            }

            setTranslationState("CONNECTING");
            setIsSynthesizing(true);

            try {
                const predictEndpoint = `${httpUrl}/api/predict`;
                console.log(`[useSignStream] Sending HTTP POST request to ${predictEndpoint} ...`);
                const response = await fetch(predictEndpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        landmarks: frameBufferRef.current
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }

                const data = await response.json();
                console.log("[useSignStream] CTC HTTP prediction response:", data);

                if (data.sentence) {
                    setRecognizedEnglish(data.sentence);
                }

                if (data.glosses && Array.isArray(data.glosses)) {
                    setDetectedGlosses(data.glosses);
                    if (data.glosses.length > 0) {
                        await synthesizeSentence(data.glosses);
                    } else {
                        setRecognizedEnglish("");
                    }
                }
                setTranslationState("IDLE");
            } catch (error: any) {
                console.error("[useSignStream] CTC HTTP prediction failed:", error);
                setErrorMessage(error.message || "Failed to get prediction from CTC API.");
                setTranslationState("ERROR");
            } finally {
                setIsSynthesizing(false);
            }
        } else {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log("[useSignStream] Sending STOP signal over WebSocket...");
                wsRef.current.send(JSON.stringify({ type: "stop" }));
            } else {
                console.log("[useSignStream] WebSocket not open when stopping. Triggering synthesis with accumulated glosses...");
                void synthesizeSentence(detectedGlossesRef.current);
            }
        }
    }, [modelType, httpUrl, synthesizeSentence]);

    // Start live WebSocket stream and frame processing loop
    const startTranslation = useCallback(async (video: HTMLVideoElement | null, canvas: HTMLCanvasElement | null) => {
        if (!video) return;
        setErrorMessage(null);
        setTranslationState("CONNECTING");
        canvasRef.current = canvas;

        // 1. Verify health check
        const isHealthy = await checkBackendHealth();
        if (!isHealthy) {
            console.warn("[useSignStream] Backend health check warned or unverified, attempting connection regardless...");
        }

        // 2. Ensure MediaPipe is initialized
        const mp = getMediaPipe();
        if (!mp.ready) {
            try {
                console.log("[useSignStream] Initializing MediaPipe models...");
                await mp.initialize({ includePose: modelType === "ctc" });
            } catch (err: any) {
                console.error("[useSignStream] MediaPipe initialization error:", err);
                setErrorMessage("Failed to load MediaPipe gesture recognition models.");
                setTranslationState("ERROR");
                return;
            }
        } else if (modelType === "ctc") {
            // If already initialized but now in ctc mode, ensure pose model is loaded
            try {
                await mp.initialize({ includePose: true });
            } catch (err) {
                console.error("[useSignStream] MediaPipe Pose initialization error:", err);
            }
        }

        const normalizer = getNormalizer();
        normalizer.reset();
        setDetectedGlosses([]);
        setRecognizedEnglish("");

        // 3. Perform Feature Validation test with Python backend (pyGRU/Bi-GRU only)
        if (modelType !== "ctc") {
            await validateFeaturesWithBackend(video);
        }

        if (modelType === "ctc") {
            frameBufferRef.current = [];
            console.log("[useSignStream] Starting CTC frame recording buffer...");
            setTranslationState("TRANSLATING");

            // Frame processing loop at ~15-20 FPS (every 50ms)
            const processLoop = (timestamp: number) => {
                if (timestamp - lastFrameTimeRef.current >= 50) {
                    lastFrameTimeRef.current = timestamp;

                    if (video) {
                        const now = performance.now();
                        const raw = mp.processVideoFrame(video, now);
                        drawSkeletonOverlay(canvas, video, raw.left_hand, raw.right_hand);

                        const mirroredRaw = mirrorRawLandmarks(raw);
                        const landmarks = extractCTCFeatures(mirroredRaw);
                        frameBufferRef.current.push(landmarks);
                    }
                }
                animFrameIdRef.current = requestAnimationFrame(processLoop);
            };
            animFrameIdRef.current = requestAnimationFrame(processLoop);
        } else {
            // 4. Open WebSocket Connection (pyGRU)
            console.log(`[useSignStream] Connecting to WebSocket at ${wsUrl} ...`);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[useSignStream] WebSocket connected successfully.");
                setTranslationState("TRANSLATING");

                // Frame processing loop at ~15-20 FPS (every 50ms)
                const processLoop = (timestamp: number) => {
                    if (timestamp - lastFrameTimeRef.current >= 50) {
                        lastFrameTimeRef.current = timestamp;

                        if (video && ws.readyState === WebSocket.OPEN) {
                            const now = performance.now();
                            const raw = mp.processVideoFrame(video, now);
                            drawSkeletonOverlay(canvas, video, raw.left_hand, raw.right_hand);

                            const mirroredRaw = mirrorRawLandmarks(raw);
                            const features = normalizer.normalizeFrame(mirroredRaw);
                            ws.send(JSON.stringify({
                                type: "landmarks",
                                schema_version: "1.0",
                                feature_dimension: 506,
                                sequence_length: 20,
                                features,
                                timestamp: Date.now()
                            }));
                        }
                    }
                    animFrameIdRef.current = requestAnimationFrame(processLoop);
                };

                animFrameIdRef.current = requestAnimationFrame(processLoop);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("[useSignStream] Received Server WS Message:", data);

                    // 1. Prediction updates (real-time streaming recognized words)
                    if (data.type === "prediction" || data.word || data.predicted_word || data.sentence_so_far) {
                        const newWord = data.word || data.predicted_word;
                        
                        if (data.sentence_so_far && typeof data.sentence_so_far === "string" && data.sentence_so_far.trim() !== "") {
                            const words = data.sentence_so_far.split(" ").filter((w: string) => w.trim() !== "");
                            setDetectedGlosses(words);
                        } else if (newWord && typeof newWord === "string") {
                            setDetectedGlosses((prev) => {
                                if (prev.length > 0 && prev[prev.length - 1] === newWord) return prev;
                                return [...prev, newWord];
                            });
                        }
                    }

                    // 2. Translation summary on session stop
                    if (data.type === "translation" || (data.words && Array.isArray(data.words)) || data.text) {
                        console.log("[useSignStream] Final translation received from WS server:", data);
                        const finalWords = Array.isArray(data.words) && data.words.length > 0
                            ? data.words
                            : (data.text ? data.text.split(" ") : []);
                        
                        const wordsToSynthesize = finalWords.length > 0 ? finalWords : detectedGlossesRef.current;
                        if (finalWords.length > 0) {
                            setDetectedGlosses(finalWords);
                        }
                        void synthesizeSentence(wordsToSynthesize);
                        ws.close();
                    }

                    // 3. Server error handling
                    if (data.type === "error" || data.error || data.message) {
                        if (data.type === "error" || data.error) {
                            console.error("[useSignStream] WebSocket server reported error:", data.message || data.error);
                            setErrorMessage(data.message || data.error);
                        }
                    }
                } catch (e) {
                    console.error("[useSignStream] Error parsing WS message:", e, "Raw data:", event.data);
                }
            };

            ws.onerror = (event) => {
                console.error("[useSignStream] WebSocket connection error event:", event);
                setErrorMessage("Connection to Sign Language API failed.");
                setTranslationState("ERROR");
            };

            ws.onclose = (event) => {
                console.log("[useSignStream] WebSocket closed with code:", event.code, "reason:", event.reason);
                if (animFrameIdRef.current) {
                    cancelAnimationFrame(animFrameIdRef.current);
                    animFrameIdRef.current = null;
                }
                if (canvas) {
                    const ctx = canvas.getContext("2d");
                    ctx?.clearRect(0, 0, canvas.width, canvas.height);
                }
                setTranslationState((prev) => (prev === "ERROR" ? "ERROR" : "IDLE"));
            };
        }
    }, [getMediaPipe, getNormalizer, modelType, wsUrl, httpUrl, checkBackendHealth]);

    // Clean up animation frame and sockets on unmount
    useEffect(() => {
        return () => {
            if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
            if (wsRef.current) wsRef.current.close();
            if (mediaPipeRef.current) mediaPipeRef.current.close();
        };
    }, []);

    return {
        translationState,
        detectedGlosses,
        recognizedEnglish,
        isSynthesizing,
        errorMessage,
        startTranslation,
        stopTranslation
    };
}
