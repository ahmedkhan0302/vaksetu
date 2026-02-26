"use client"

import { Compass } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { TopicCard } from "@/components/topic-card"

const topics = [
    {
        title: "Resources",
        description: "Guides and lessons to help you learn sign language step by step.",
        imageUrl: "/images/topics/resources.jpg",
        href: "/explore/resources",
    },
    {
        title: "Quiz",
        description: "Test your sign recognition with quick, interactive practice quizzes.",
        imageUrl: "/images/topics/quiz.jpg",
        href: "/explore/quiz",
    },
    {
        title: "Leaderboard",
        description: "Track your progress and see top scores from the community.",
        imageUrl: "/images/topics/leaderboard.jpg",
        href: "/explore/leaderboard",
    },
    {
        title: "Communities",
        description: "Connect with learners and Deaf/HoH communities to practice and share.",
        imageUrl: "/images/topics/communities.jpg",
        href: "/explore/communities",
    },
    {
        title: "Dictionary",
        description: "Search signs by word to view meanings, examples, and variations.",
        imageUrl: "/images/topics/dictionary.jpg",
        href: "/explore/dictionary",
    },
]

export default function ExplorePage() {
    const isOddCount = topics.length % 2 === 1

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <Compass className="size-4 text-muted-foreground" />
                    <h1 className="text-lg font-semibold leading-none">Explore</h1>
                </div>
            </header>

            <div className="flex flex-1 flex-col p-4 pt-0">
                <div className="mx-auto w-full max-w-6xl">
                    {/* cap width so 2-column tiles don't stretch too wide */}
                    <div className="mx-auto w-full max-w-4xl">
                        <div className="grid gap-10 sm:grid-cols-2">
                            {topics.map((t, idx) => {
                                const isLast = idx === topics.length - 1
                                const centerLast = isOddCount && isLast

                                return (
                                    <div
                                        key={t.title}
                                        className={centerLast ? "sm:col-span-2 sm:flex sm:justify-center" : ""}
                                    >
                                        {/* keep centered last tile same size as other tiles */}
                                        <div className={centerLast ? "w-full sm:max-w-105" : "w-full"}>
                                            <TopicCard
                                                title={t.title}
                                                description={t.description}
                                                imageUrl={t.imageUrl}
                                                href={t.href}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}