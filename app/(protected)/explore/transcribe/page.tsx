"use client"

import * as React from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

// WAV encoding helper
function encodeWAV(samples: Float32Array, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  
  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
        v.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  /* RIFF identifier */ writeString(view, 0, 'RIFF')
  /* RIFF chunk length */ view.setUint32(4, 36 + samples.length * 2, true)
  /* RIFF type */ writeString(view, 8, 'WAVE')
  /* format chunk identifier */ writeString(view, 12, 'fmt ')
  /* format chunk length */ view.setUint32(16, 16, true)
  /* sample format (raw) */ view.setUint16(20, 1, true)
  /* channel count */ view.setUint16(22, 1, true)
  /* sample rate */ view.setUint32(24, sampleRate, true)
  /* byte rate */ view.setUint32(28, sampleRate * 2, true)
  /* block align */ view.setUint16(32, 2, true)
  /* bits per sample */ view.setUint16(34, 16, true)
  /* data chunk identifier */ writeString(view, 36, 'data')
  /* data chunk length */ view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
  return buffer
}

export default function TranscribePage() {
    const [engine, setEngine] = React.useState('sarvam')
    const [language, setLanguage] = React.useState('unknown')
    
    const [recording, setRecording] = React.useState(false)
    const [processing, setProcessing] = React.useState(false)
    const [transcription, setTranscription] = React.useState<any>(null)
    const [error, setError] = React.useState<string | null>(null)
    
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
    const recognitionRef = React.useRef<any>(null)
    const chunksRef = React.useRef<Blob[]>([])

    const startRecording = async () => {
        setError(null)
        setTranscription(null)

        if (engine === 'webspeech') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setError("Your browser does not support Web Speech API.");
                return;
            }
            
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            // Web speech works best with specific BCP-47 tags
            recognition.lang = language === 'unknown' ? 'en-US' : language; 

            let finalTranscript = '';
            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                setTranscription({
                    engine: "Web Speech API",
                    status: "recording",
                    final_transcript: finalTranscript,
                    interim_transcript: interimTranscript || undefined
                })
            };

            recognition.onerror = (event: any) => {
                setError(`Web Speech error: ${event.error}`);
                setRecording(false);
            };

            recognition.onend = () => {
                setRecording(false);
                setTranscription((prev: any) => prev ? { ...prev, status: "completed" } : null)
            };

            try {
                recognition.start();
                setRecording(true);
                recognitionRef.current = recognition;
            } catch(e: any) {
                setError(e.message)
            }
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mr = new MediaRecorder(stream)
            mr.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }
            mr.onstop = processAudio
            chunksRef.current = []
            mr.start()
            setRecording(true)
            mediaRecorderRef.current = mr
        } catch (err: any) {
            setError("Could not access microphone.")
        }
    }

    const stopRecording = () => {
        if (engine === 'webspeech') {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            return;
        }

        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop()
            setRecording(false)
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
        }
    }

    const processAudio = async () => {
        setProcessing(true)
        try {
            const blob = new Blob(chunksRef.current)
            const arrayBuffer = await blob.arrayBuffer()
            
            const actx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
            const audioBuffer = await actx.decodeAudioData(arrayBuffer)
            
            const float32Array = audioBuffer.getChannelData(0)
            const wavBuffer = encodeWAV(float32Array, 16000)
            
            let binary = ''
            const bytes = new Uint8Array(wavBuffer)
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i])
            }
            const base64Audio = window.btoa(binary)
            
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: base64Audio, language })
            })
            
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || "Server error")
            }
            
            setTranscription(data.result)
        } catch (err: any) {
            setError(err.message || "An error occurred.")
        } finally {
            setProcessing(false)
        }
    }

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
                            <CardTitle>Dual-Engine Transcription</CardTitle>
                            <CardDescription>Select your desired engine and language, then speak into your mic.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4 text-center">
                            
                            <div className="flex w-full gap-4 mb-4 flex-col sm:flex-row justify-center">
                               <div className="flex flex-col gap-1 items-start text-sm w-full sm:w-1/2">
                                  <label className="font-semibold text-muted-foreground">Provider Engine</label>
                                  <select 
                                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background" 
                                      value={engine} 
                                      onChange={e => setEngine(e.target.value)}
                                      disabled={recording || processing}
                                  >
                                      <option value="sarvam">Sarvam AI (Batch API)</option>
                                      <option value="webspeech">Browser Web Speech API</option>
                                  </select>
                               </div>
                               <div className="flex flex-col gap-1 items-start text-sm w-full sm:w-1/2">
                                  <label className="font-semibold text-muted-foreground">Language</label>
                                  <select 
                                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background" 
                                      value={language} 
                                      onChange={e => setLanguage(e.target.value)}
                                      disabled={recording || processing}
                                  >
                                      <option value="unknown">Auto-Detect / Default</option>
                                      <option value="en-IN">English (India)</option>
                                      <option value="hi-IN">Hindi (hi-IN)</option>
                                      <option value="te-IN">Telugu (te-IN)</option>
                                  </select>
                               </div>
                            </div>

                            {!recording ? (
                                <Button size="lg" onClick={startRecording} className="w-48 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white" disabled={processing}>
                                    <Mic className="mr-2 h-5 w-5" /> Start Recording
                                </Button>
                            ) : (
                                <Button size="lg" variant="destructive" onClick={stopRecording} className="w-48 animate-pulse text-white">
                                    <Square className="mr-2 h-5 w-5" /> Stop Recording
                                </Button>
                            )}

                            {processing && (
                                <div className="flex items-center text-sm text-foreground mt-2">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-green-600" /> Processing audio and querying Sarvam...
                                </div>
                            )}

                            {error && (
                                <div className="text-red-500 text-sm mt-2 font-medium">{error}</div>
                            )}

                            {transcription && (
                                <div className="w-full mt-4 flex flex-col gap-2 text-left border rounded-md p-4 bg-muted/40">
                                    <h3 className="font-semibold text-foreground border-b pb-2 mb-2">Raw JSON Result:</h3>
                                    <div className="p-2 min-h-[100px] overflow-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                                        {JSON.stringify(transcription, null, 2)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
