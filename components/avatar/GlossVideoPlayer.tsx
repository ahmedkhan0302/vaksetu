"use client";

import React, { useState, useEffect, useRef } from "react";
import { fetchGlossesFromText } from "@/lib/api/gloss";
import { Loader2, Play, Pause } from "lucide-react";

type Props = {
    englishText: string;
};

export function GlossVideoPlayer({ englishText }: Props) {
    const [glossList, setGlossList] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSpellingFallback, setIsSpellingFallback] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    
    // Auto-update gloss list whenever english text changes
    useEffect(() => {
        if (!englishText) {
            setGlossList([]);
            setCurrentIndex(0);
            return;
        }

        const fetchMapping = async () => {
            setIsLoading(true);
            try {
                const glosses = await fetchGlossesFromText(englishText);
                setGlossList(glosses);
                setCurrentIndex(0);
            } catch (err) {
                console.error("Failed to map text to glosses", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMapping();
    }, [englishText]);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const gapTimerRef = useRef<number | null>(null);

    // Handle standard video completion
    const handleVideoEnd = () => {
        if (glossList.length === 0) return;
        // If we reach the end, reset back to 0 to loop
        const nextIndex = currentIndex + 1;
        if (nextIndex >= glossList.length) {
            // Small gap before repeating the whole sequence
            setTimeout(() => setCurrentIndex(0), 1500); 
        } else {
            setCurrentIndex(nextIndex);
        }
    };

    // The Magic Fallback:
    // If a whole word (e.g. "APPLE.mp4") breaks, catching this error safely slices "A", "P", "P", "L", "E" directly into the queue sequentially
    const handleVideoError = () => {
        if (!glossList[currentIndex]) return;
        
        const failingWord = glossList[currentIndex];
        
        // Defensive check: if individual letter fails (e.g. "A.mp4" is missing), just skip to prevent infinite fallback loop.
        if (failingWord.length === 1) {
            console.warn(`Critical missing alphabet asset: ${failingWord}.mp4. Skipping.`);
            handleVideoEnd();
            return;
        }

        console.log(`Video asset for "${failingWord}" missing. Falling back to Fingerspelling sequence.`);
        setIsSpellingFallback(true);

        const letters = failingWord.split("");
        // Append a special GAP command after spelling a word
        const newSegment = [...letters, "__GAP__"];
        
        const newList = [...glossList];
        newList.splice(currentIndex, 1, ...newSegment);
        
        setGlossList(newList);
        // We stay on the same currentIndex, which is now the first letter in the array
    };

    // Manage the magic __GAP__ delays for fingerspelling 
    useEffect(() => {
        if (glossList[currentIndex] === "__GAP__") {
            setIsSpellingFallback(false);
            if (isPlaying) {
                gapTimerRef.current = window.setTimeout(() => {
                    handleVideoEnd();
                }, 800); // 800ms gap to let the user track the spelling
            }
            return () => {
                if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
            };
        }
    }, [currentIndex, glossList, isPlaying]);

    // Force Play/Pause logic gracefully whenever external states change
    useEffect(() => {
        if (!videoRef.current || glossList[currentIndex] === "__GAP__") return;
        
        if (isPlaying) {
            videoRef.current.play().catch(e => {
                // Auto-play block handling (usually handled by onError, but caught here safely)
            });
        } else {
            videoRef.current.pause();
        }
    }, [currentIndex, glossList, isPlaying]);

    if (!englishText) {
        return (
            <div className="flex h-full min-h-60 flex-col items-center justify-center rounded-lg bg-muted/40 p-4 border border-dashed text-muted-foreground text-sm">
                Waiting for speech...
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-full min-h-60 flex-col items-center justify-center rounded-lg bg-muted/20 p-4 border text-muted-foreground space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                <p className="text-sm">Mapping Glosses directly securely...</p>
            </div>
        );
    }

    const currentGloss = glossList[currentIndex];
    const isGap = currentGloss === "__GAP__";

    return (
        <div className="flex flex-col items-center overflow-hidden rounded-lg bg-card border border-green-600/20 pb-4 h-full min-h-[300px] w-full shadow-sm">
            {/* Status Header */}
            <div className="w-full bg-green-50/50 dark:bg-green-900/10 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-b border-green-600/10">
                <div className="flex items-center gap-3">
                    <button 
                         onClick={() => setIsPlaying(!isPlaying)}
                         className="p-1.5 rounded-full transition-colors flex items-center justify-center border border-green-200 dark:border-green-800 bg-white dark:bg-zinc-900 hover:bg-green-50 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 shadow-sm"
                         title={isPlaying ? "Pause Sequence" : "Play Sequence"}
                    >
                        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                    </button>
                    <span className="font-medium">Playing Index {currentIndex + 1} / {glossList.length}</span>
                </div>
                {isSpellingFallback && (
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded font-mono">Fingerspelling Mode</span>
                )}
            </div>

            {/* Video Player Frame */}
            <div className="flex flex-col items-center justify-center flex-1 w-full bg-muted/5 min-h-[300px] relative">
                {isGap ? (
                    <div className="animate-pulse text-muted-foreground tracking-wider text-sm font-mono flex items-center gap-2">
                        <span>[ WORD BREAK ]</span> 
                    </div>
                ) : (
                    currentGloss && (
                        <video 
                            ref={videoRef}
                            src={`/Glosses/Videos/assets/${currentGloss}.mp4`}
                            autoPlay
                            muted
                            playsInline
                            className="w-[80%] h-auto max-h-[300px] object-contain mx-auto rounded-md"
                            onEnded={handleVideoEnd}
                            onError={handleVideoError}
                        />
                    )
                )}
            </div>
            
            <div className="mt-4 px-5 py-1.5 text-center bg-green-100 dark:bg-green-900/30 rounded-full border border-green-200 dark:border-green-800/50 mx-auto shadow-sm">
                <p className="text-sm font-semibold tracking-wide text-green-800 dark:text-green-300 min-w-16">
                    {isGap ? "..." : (currentGloss || "")}
                </p>
            </div>
        </div>
    );
}
