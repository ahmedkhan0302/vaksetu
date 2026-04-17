"use client";

import React, { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Languages, Mic, Camera } from "lucide-react";
import { CameraPreview } from "@/components/camera-preview";
import { AudioRecorderCard } from "@/components/microphone-input";
import { GlossVideoPlayer } from "@/components/avatar/GlossVideoPlayer";

type Mode = "sign-to-text" | "speech-to-sign";

export default function Page() {
    const [mode, setMode] = useState<Mode>("sign-to-text");
    const [speechText, setSpeechText] = useState("");

    const isSignToText = mode === "sign-to-text";

    const handleModeSwitch = (newMode: Mode) => {
        setMode(newMode);
        setSpeechText("");
    };

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex w-full items-center justify-between gap-2 px-4">
                    {/* Left side */}
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Languages className="size-4 text-muted-foreground" />
                        <h1 className="text-lg font-semibold leading-none">
                            {isSignToText ? "Translate (Sign → Text/Speech)" : "Translate (Speech → Sign)"}
                        </h1>
                    </div>

                    {/* Right side toggle */}
                    <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Mode
            </span>

                        <div className="flex items-center rounded-lg border bg-background p-1">
                            <button
                                type="button"
                                onClick={() => handleModeSwitch("sign-to-text")}
                                className={[
                                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                                    isSignToText
                                        ? "bg-muted text-foreground"
                                        : "text-muted-foreground hover:text-foreground",
                                ].join(" ")}
                                aria-pressed={isSignToText}
                            >
                                <Camera className="h-4 w-4" />
                                <span className="hidden sm:inline">Sign</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleModeSwitch("speech-to-sign")}
                                className={[
                                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                                    !isSignToText
                                        ? "bg-muted text-foreground"
                                        : "text-muted-foreground hover:text-foreground",
                                ].join(" ")}
                                aria-pressed={!isSignToText}
                            >
                                <Mic className="h-4 w-4" />
                                <span className="hidden sm:inline">Speech</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 flex-col p-4 pt-0">
                <div className="mx-auto w-full max-w-6xl">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Left card: Camera OR Microphone */}
                        <section className="rounded-xl border bg-card p-4 shadow-sm">
                            <header className="mb-3 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-foreground">
                                    {isSignToText ? "Camera" : "Microphone"}
                                </h2>
                                <span className="text-xs text-muted-foreground">
                  {isSignToText ? "Center your hand in frame" : "Speak clearly into your mic"}
                </span>
                            </header>

                            {isSignToText ? (
                                <CameraPreview />
                            ) : (
                                <AudioRecorderCard onRecordingComplete={setSpeechText} />
                            )}
                        </section>

                        {/* Right card: Text result OR Avatar */}
                        <section className="rounded-xl border bg-card p-4 shadow-sm">
                            <header className="mb-3 flex items-center justify-between gap-3">
                                <h2 className="text-sm font-semibold text-foreground">
                                    {isSignToText ? "Translated Result" : "Sign Avatar"}
                                </h2>

                                {isSignToText && (
                                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                        Language
                                        <select
                                            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
                                            defaultValue="en"
                                        >
                                            <option value="en">English</option>
                                            <option value="ur">Urdu</option>
                                            <option value="hi">Hindi</option>
                                            <option value="pa">Punjabi</option>
                                            <option value="ps">Pashto</option>
                                        </select>
                                    </label>
                                )}
                            </header>

                            {isSignToText ? (
                                <div className="min-h-60 rounded-lg bg-muted/40 p-4">
                                    <p className="text-sm text-muted-foreground">
                                        Waiting for translation…
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 h-full pb-4">
                                    <GlossVideoPlayer englishText={speechText} />
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}