"use client"

import * as React from "react"

type CameraPreviewProps = {
    className?: string
    facingMode?: "user" | "environment"
    videoRef: React.RefObject<HTMLVideoElement | null>
    canvasRef: React.RefObject<HTMLCanvasElement | null>
    mirrored?: boolean
}

export function CameraPreview({
    className,
    facingMode = "user",
    videoRef,
    canvasRef,
    mirrored = true
}: CameraPreviewProps) {
    const streamRef = React.useRef<MediaStream | null>(null)
    const [cameraError, setCameraError] = React.useState<string | null>(null)

    const startCamera = React.useCallback(async () => {
        setCameraError(null)

        try {
            streamRef.current?.getTracks().forEach((t) => t.stop())
            streamRef.current = null

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            })

            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") {
                return
            }
            setCameraError(
                e instanceof Error ? e.message : "Failed to access the camera."
            )
        }
    }, [facingMode, videoRef])

    React.useEffect(() => {
        void startCamera()

        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop())
            streamRef.current = null
        }
    }, [startCamera])

    return (
        <div className={className}>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted shadow-inner">
                {/* Live Video Preview */}
                <video
                    ref={videoRef}
                    className={[
                        "h-full w-full object-cover",
                        (facingMode === "user" && mirrored) ? "-scale-x-100" : "",
                    ].join(" ")}
                    muted
                    playsInline
                    autoPlay
                />

                {/* Hand Skeleton Overlay Canvas */}
                <canvas
                    ref={canvasRef}
                    className={[
                        "absolute inset-0 h-full w-full pointer-events-none object-cover",
                        (facingMode === "user" && mirrored) ? "-scale-x-100" : "",
                    ].join(" ")}
                />

                {/* Camera Error Message */}
                {cameraError ? (
                    <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted-foreground bg-background/80">
                        <div>
                            <div className="font-semibold text-foreground text-base">Camera Access Error</div>
                            <div className="mt-1 max-w-xs mx-auto text-xs">{cameraError}</div>
                            <button
                                type="button"
                                onClick={() => void startCamera()}
                                className="mt-4 rounded-md border bg-background hover:bg-muted px-4 py-2 text-sm font-medium transition"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}