"use client"

import { HelpCircle } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function QuizPage() {
    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <HelpCircle className="size-4 text-muted-foreground" />
                    <h1 className="text-lg font-semibold leading-none">Quiz</h1>
                </div>
            </header>

            <div className="flex flex-1 flex-col p-4 pt-0">
                <div className="mx-auto w-full max-w-6xl">
                    <section className="rounded-xl border bg-card p-6 shadow-sm">
                        <p className="text-sm text-muted-foreground">
                            Quiz content goes here.
                        </p>
                    </section>
                </div>
            </div>
        </>
    )
}