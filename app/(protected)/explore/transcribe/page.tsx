"use client"

import * as React from "react"
import { Mic, Square, Loader2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useTranscription } from "@/lib/hooks/useTranscription"

const ACTIVE_STT_ENGINE = 'sarvam'; // 'sarvam' or 'webspeech'

export default function TranscribePage() {
    const [language, setLanguage] = React.useState('hi-IN') // Default to Hindi to test translation

    // Using a 20 second hard limit (20,000ms)
    const { 
        startRecording, 
        stopRecording, 
        isRecording, 
        isProcessing, 
        error, 
        result, 
        timeRemainingMs
    } = useTranscription(ACTIVE_STT_ENGINE, language, 20000)

    // Calculate how many seconds left nicely
    const secondsRemaining = Math.max(0, Math.ceil(timeRemainingMs / 1000));

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                    <Mic className="size-4 text-muted-foreground" />
                    <h1 className="text-lg font-semibold leading-none">Transcription</h1>
                </div>
            </header>

            <div className="flex flex-1 flex-col p-4 pt-0">
                <div className="mx-auto w-full max-w-2xl mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Unified Transcription Engine</CardTitle>
                            <CardDescription>
                                Speak into your microphone to transcribe and translate audio in completely secure bursts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4 text-center">
                            
                            {/* Disabled Dropdowns while anything is running */}
                            <div className="flex w-full mb-4 justify-center">
                               <div className="flex flex-col gap-1 items-start text-sm w-full sm:w-1/2">
                                  <label className="font-semibold text-muted-foreground">Select Spoken Language</label>
                                  <select 
                                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background" 
                                      value={language} 
                                      onChange={e => setLanguage(e.target.value)}
                                      disabled={isRecording || isProcessing}
                                  >
                                      <option value="en-IN">English (India)</option>
                                      <option value="hi-IN">Hindi (hi-IN)</option>
                                      <option value="te-IN">Telugu (te-IN)</option>
                                  </select>
                               </div>
                            </div>

                            {/* Only show "Record" if idle */}
                            {!isRecording && !isProcessing && (
                                <div className="py-2">
                                    <Button 
                                        size="lg" 
                                        onClick={startRecording} 
                                        className="w-56 bg-green-600 hover:bg-green-700 text-white rounded-full h-12 text-base font-semibold transition-all shadow-md hover:shadow-lg" 
                                    >
                                        <Mic className="mr-2 h-5 w-5" /> Start Analyzing Voice
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-3">You will have exactly 20 seconds to speak.</p>
                                </div>
                            )}

                            {/* Show entirely different interface specifically WHILE recording */}
                            {isRecording && (
                                <div className="w-full max-w-md bg-muted/30 border border-green-600/30 rounded-xl p-6 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
                                        <div className="relative bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 p-4 rounded-full">
                                            <Mic className="h-8 w-8 animate-pulse" />
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-lg font-semibold text-foreground mb-1">Listening Closely...</h3>
                                    
                                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-500 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full mb-6">
                                        <Clock className="w-4 h-4" />
                                        <span className="font-mono font-medium">Recording stops internally in {secondsRemaining}s</span>
                                    </div>

                                    <Button 
                                        size="default" 
                                        variant="destructive" 
                                        onClick={stopRecording} 
                                        className="w-full sm:w-auto px-8"
                                    >
                                        <Square className="mr-2 h-4 w-4" /> Stop & Finalize Text
                                    </Button>
                                </div>
                            )}

                            {/* Show spinning loader purely while processing is happening after stop */}
                            {isProcessing && (
                                <div className="w-full max-w-md bg-muted/30 border border-amber-600/30 rounded-xl p-8 flex flex-col items-center animate-in fade-in duration-300">
                                    <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
                                    <h3 className="text-lg font-semibold text-foreground">Processing Audio Securely</h3>
                                    <p className="text-sm text-muted-foreground mt-2">Transcribing and executing English translations...</p>
                                </div>
                            )}

                            {/* Error Block */}
                            {error && !isRecording && !isProcessing && (
                                <div className="w-full max-w-lg text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-4 rounded-md text-sm mt-2 font-medium">
                                    {error}
                                </div>
                            )}

                            {/* Results Block - ONLY displays completely compiled text at the very end */}
                            {result && !isRecording && !isProcessing && (
                                <div className="w-full mt-4 flex flex-col gap-4 text-left animate-in slide-in-from-bottom-4 duration-500">
                                    {/* Native Script Box */}
                                    <div className="border border-green-600/30 bg-green-50/50 dark:bg-green-900/10 rounded-md p-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-500 mb-2">Native Transcript Generated</h3>
                                        <p className="text-foreground text-lg px-2 py-1 leading-relaxed rounded bg-background/50 border border-green-100 dark:border-green-800 shadow-sm min-h-12 whitespace-pre-wrap">{result.native_text || "No text detected."}</p>
                                    </div>
                                    
                                    {/* English Translation Box */}
                                    {result.english_text && (
                                        <div className="border border-blue-600/30 bg-blue-50/50 dark:bg-blue-900/10 rounded-md p-4">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-500 mb-2">English Translation Model Output</h3>
                                            <p className="text-foreground text-lg px-2 py-1 leading-relaxed rounded bg-background/50 border border-blue-100 dark:border-blue-800 shadow-sm min-h-12 whitespace-pre-wrap">{result.english_text}</p>
                                        </div>
                                    )}

                                    <Button 
                                        variant="outline" 
                                        className="mt-4 mx-auto block" 
                                        onClick={startRecording}
                                    >
                                        Record Another Message
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
