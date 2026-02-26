import { Separator } from "@/components/ui/separator"
import {
    SidebarTrigger,
} from "@/components/ui/sidebar"
import {Languages} from "lucide-react"
import { CameraPreview } from "@/components/camera-preview";

export default function Page() {
    return (
        <>
            <header
                className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1"/>
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"/>
                    <Languages className="size-4 text-muted-foreground"/>
                    <h1 className="text-lg font-semibold leading-none">Translate</h1>
                </div>
            </header>
            <div className="flex flex-1 flex-col p-4 pt-0">
                <div className="mx-auto w-full max-w-6xl">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Left: Camera module */}
                        <section className="rounded-xl border bg-card p-4 shadow-sm">
                            <header className="mb-3 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-foreground">Camera</h2>
                                <span className="text-xs text-muted-foreground">
                                    Center your hand in frame
                                </span>
                            </header>

                            {/* Camera preview area (replace with your actual camera component) */}
                            <CameraPreview/>
                            {/*<div className="aspect-video w-full overflow-hidden rounded-lg bg-muted" />*/}
                        </section>

                        {/* Right: Translated result module */}
                        <section className="rounded-xl border bg-card p-4 shadow-sm">
                            <header className="mb-3 flex items-center justify-between gap-3">
                                <h2 className="text-sm font-semibold text-foreground">
                                    Translated Result
                                </h2>

                                {/* Language dropdown (swap with shadcn Select if you want) */}
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
                            </header>

                            {/* Result display */}
                            <div className="min-h-60 rounded-lg bg-muted/40 p-4">
                                <p className="text-sm text-muted-foreground">
                                    Waiting for translation…
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </>
    )
}
