"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DictionaryCard, type DictionaryEntry } from "@/components/dictionary/dictionary-card";

function normalize(s: string) {
    return s.trim().toLowerCase();
}

function sortEntries(data: DictionaryEntry[]): DictionaryEntry[] {
    return [...data].sort((a, b) => {
        const isNumA = a.tags?.includes("numbers");
        const isNumB = b.tags?.includes("numbers");
        const isAlphaA = a.tags?.includes("alphabet");
        const isAlphaB = b.tags?.includes("alphabet");

        // Priority 1: numbers
        if (isNumA && !isNumB) return -1;
        if (!isNumA && isNumB) return 1;
        if (isNumA && isNumB) {
            const valA = parseInt(a.query, 10);
            const valB = parseInt(b.query, 10);
            if (!isNaN(valA) && !isNaN(valB) && valA !== valB) {
                return valA - valB;
            }
            if (a.query !== b.query) return a.query.localeCompare(b.query);
            const hasVideoA = !!a.signVideoUrl;
            const hasVideoB = !!b.signVideoUrl;
            if (hasVideoA && !hasVideoB) return -1;
            if (!hasVideoA && hasVideoB) return 1;
            return a.id.localeCompare(b.id);
        }

        // Priority 2: alphabet
        if (isAlphaA && !isAlphaB) return -1;
        if (!isAlphaA && isAlphaB) return 1;
        if (isAlphaA && isAlphaB) {
            const valA = a.query.toLowerCase();
            const valB = b.query.toLowerCase();
            if (valA !== valB) return valA.localeCompare(valB);
            const hasVideoA = !!a.signVideoUrl;
            const hasVideoB = !!b.signVideoUrl;
            if (hasVideoA && !hasVideoB) return -1;
            if (!hasVideoA && hasVideoB) return 1;
            return a.id.localeCompare(b.id);
        }

        // Priority 3: other words (alphabetical)
        const textA = a.translation.toLowerCase();
        const textB = b.translation.toLowerCase();
        return textA.localeCompare(textB);
    });
}

export default function DictionaryPage() {
    const [entries, setEntries] = useState<DictionaryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [selectedTag, setSelectedTag] = useState<"all" | string>("all");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setLoadError(null);

            try {
                // Fetch dynamic entries from api route
                const res = await fetch("/api/dictionary", { cache: "no-store" });
                if (!res.ok) throw new Error(`Failed to load dictionary entries (${res.status})`);

                const data = (await res.json()) as DictionaryEntry[];
                const videoOnlyData = data.filter((e) => !!e.signVideoUrl);
                const sorted = sortEntries(videoOnlyData);

                if (!cancelled) {
                    setEntries(sorted);
                }
            } catch (e) {
                if (!cancelled) {
                    setLoadError(e instanceof Error ? e.message : "Failed to load dictionary entries.");
                    setEntries([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const tags = useMemo<string[]>(() => {
        const set = new Set<string>();
        for (const e of entries) (e.tags ?? []).forEach((t) => set.add(t));
        return ["all", ...Array.from(set).sort()];
    }, [entries]);

    const isValidTag = (v: string): v is "all" | string => tags.includes(v);

    const results = useMemo(() => {
        const q = normalize(search);

        return entries.filter((e) => {
            const matchesText =
                !q ||
                normalize(e.query).includes(q) ||
                normalize(e.translation).includes(q) ||
                (e.tags ?? []).some((t) => normalize(t).includes(q));

            const matchesTag = selectedTag === "all" ? true : (e.tags ?? []).includes(selectedTag);

            return matchesText && matchesTag;
        });
    }, [entries, search, selectedTag]);

    // If tags changed (because entries loaded) and selectedTag no longer exists, reset to all
    useEffect(() => {
        if (!isValidTag(selectedTag)) setSelectedTag("all");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tags]);

    return (
        <div className="min-h-screen px-4 py-8 md:px-10">
            <div className="mx-auto w-full max-w-6xl space-y-6">
                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dictionary</h1>
                    <p className="text-sm text-muted-foreground">
                        Search translations and view the corresponding sign media.
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
                            disabled={loading || !!loadError}
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
                            Results ({loading ? "…" : results.length})
                        </h2>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-border bg-background p-8 text-center">
                            <p className="text-sm text-muted-foreground">Loading dictionary…</p>
                        </div>
                    ) : loadError ? (
                        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
                            <p className="text-sm font-medium text-red-600">Failed to load entries</p>
                            <p className="mt-1 text-sm text-red-600/90">{loadError}</p>
                            <p className="mt-3 text-sm text-muted-foreground">
                                Make sure the dictionary API is available at{" "}
                                <code className="rounded bg-muted px-1">/api/dictionary</code>
                            </p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                No matches found. Try a different search term.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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
            </div>
        </div>
    );
}