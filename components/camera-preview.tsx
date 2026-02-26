"use client"

import * as React from "react"

type CameraPreviewProps = {
    className?: string
    facingMode?: "user" | "environment"
}

export function CameraPreview({
                                  className,
                                  facingMode = "user",
                              }: CameraPreviewProps) {
    const videoRef = React.useRef<HTMLVideoElement | null>(null)
    const streamRef = React.useRef<MediaStream | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    const startCamera = React.useCallback(async () => {
        setError(null)

        try {
            // Stop any existing stream first
            streamRef.current?.getTracks().forEach((t) => t.stop())
            streamRef.current = null

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false,
            })

            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                // iOS Safari sometimes needs an explicit play() call
                await videoRef.current.play()
            }
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Failed to access the camera."
            )
        }
    }, [facingMode])

    React.useEffect(() => {
        void startCamera()

        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop())
            streamRef.current = null
        }
    }, [startCamera])

    return (
        <div className={className}>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        <video
            ref={videoRef}
    className="h-full w-full object-cover"
    muted
    playsInline
    autoPlay
    />

    {error ? (
            <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted-foreground">
            <div>
                <div className="font-medium text-foreground">Camera error</div>
            <div className="mt-1">{error}</div>
            <button
        type="button"
        onClick={() => void startCamera()}
    className="mt-3 rounded-md border bg-background px-3 py-2 text-sm"
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