"use client";

import React, { useMemo, useState } from "react";
import { DictionaryCard, type DictionaryEntry } from "@/components/dictionary-card";

const mockResults: DictionaryEntry[] = [
    {
        id: "1",
        query: "Hello",
        translation: "नमस्ते",
        signImageUrl:
            "https://images.unsplash.com/photo-1520975693411-8a1b1f5f55c7?auto=format&fit=crop&w=1200&q=60",
        tags: ["greeting"],
    },
    {
        id: "2",
        query: "Thank you",
        translation: "धन्यवाद",
        signImageUrl:
            "https://images.unsplash.com/photo-1520975869010-9c04f8d5b0da?auto=format&fit=crop&w=1200&q=60",
        tags: ["polite"],
    },
    {
        id: "3",
        query: "Yes",
        translation: "हाँ",
        signImageUrl:
            "https://images.unsplash.com/photo-1520975817973-4a2fbbd3a0cc?auto=format&fit=crop&w=1200&q=60",
        tags: ["common words"],
    },
];

function normalize(s: string) {
    return s.trim().toLowerCase();
}

export default function DictionaryPage() {
    const [search, setSearch] = useState("");
    const [selectedTag, setSelectedTag] = useState<"all" | string>("all");

    const tags = useMemo<string[]>(() => {
        const set = new Set<string>();
        for (const e of mockResults) (e.tags ?? []).forEach((t) => set.add(t));
        return ["all", ...Array.from(set).sort()];
    }, []);

    const isValidTag = (v: string): v is "all" | string => tags.includes(v);

    const results = useMemo(() => {
        const q = normalize(search);

        return mockResults.filter((e) => {
            const matchesText =
                !q ||
                normalize(e.query).includes(q) ||
                normalize(e.translation).includes(q) ||
                (e.tags ?? []).some((t) => normalize(t).includes(q));

            const matchesTag =
                selectedTag === "all" ? true : (e.tags ?? []).includes(selectedTag);

            return matchesText && matchesTag;
        });
    }, [search, selectedTag]);

    return (
        <div className="min-h-screen px-4 py-8 md:px-10">
            <div className="mx-auto w-full max-w-6xl space-y-6">
                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                        Dictionary
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Search translations and view the corresponding sign image (frontend-only for now).
                    </p>
                </header>

                <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:max-w-xl">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search a word, translation, or tag…"
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm outline-none ring-0 transition focus:border-primary/60 focus:outline-none"
                            aria-label="Search dictionary"
                        />
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path
                                    d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Filter:</span>

                        <select
                            value={selectedTag}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (isValidTag(v)) setSelectedTag(v);
                            }}
                            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                            aria-label="Filter by tag"
                        >
                            {tags.map((t) => (
                                <option key={t} value={t}>
                                    {t === "all" ? "All" : t}
                                </option>
                            ))}
                        </select>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-muted-foreground">
                            Results ({results.length})
                        </h2>
                    </div>

                    {results.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                No matches found. Try a different search term.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {results.map((entry) => (
                                <DictionaryCard
                                    key={entry.id}
                                    entry={entry}
                                    onTagClick={(tag) => setSelectedTag(tag)}
                                />
                            ))}
                        </div>
                    )}
                </section>
                {/*
                <section className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Backend hookup (later):</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>
                            Replace <code className="rounded bg-muted px-1">mockResults</code> with a fetch to your API.
                        </li>
                        <li>
                            Each entry should return <code className="rounded bg-muted px-1">translation</code> and a{" "}
                            <code className="rounded bg-muted px-1">signImageUrl</code> (Supabase S3 public URL or signed URL).
                        </li>
                    </ul>
                </section>
                */}
            </div>
        </div>
    );
}