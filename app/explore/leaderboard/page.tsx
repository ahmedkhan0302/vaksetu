"use client"

import * as React from "react"
import { Trophy } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthGate } from "@/components/auth/auth-gate"

export default function LeaderboardPage() {
    const header = (
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                <Trophy className="size-4 text-muted-foreground" />
                <h1 className="text-lg font-semibold leading-none">Leaderboard</h1>
            </div>
        </header>
    )

    return (
        <AuthGate>
            {header}

            <div className="flex flex-1 flex-col p-4 pt-0">
                <div className="mx-auto w-full max-w-5xl">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Community Leaderboard</CardTitle>
                            <CardDescription>Placeholder UI for now — backend will provide real rankings later.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                                Top users and scores will appear here.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthGate>
    )
}