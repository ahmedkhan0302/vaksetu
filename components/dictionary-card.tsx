"use client";

import React from "react";

export type DictionaryEntry = {
    id: string;
    query: string;
    translation: string;
    tags?: string[];

    // media (public/ paths are referenced with leading "/")
    signImageUrl?: string; // e.g. "/Glosses/1.jpg"
    signVideoUrl?: string; // e.g. "/Glosses/Videos/assets/After.mp4"
};

type DictionaryCardProps = {
    entry: DictionaryEntry;
    onTagClick?: (tag: string) => void;
};

function DictionaryMedia({ entry }: { entry: DictionaryEntry }) {
    // Prefer video if available
    if (entry.signVideoUrl) {
        return (
            <video
                className="h-full w-full object-cover"
                src={entry.signVideoUrl}
                controls
                playsInline
                preload="metadata"
            />
        );
    }

    // Otherwise show image if available
    if (entry.signImageUrl) {
        // eslint-disable-next-line @next/next/no-img-element
        return (
            <img
                src={entry.signImageUrl}
                alt={`Sign for ${entry.translation}`}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                loading="lazy"
            />
        );
    }

    // Fallback
    return (
        <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
            No media
        </div>
    );
}

export function DictionaryCard({ entry, onTagClick }: DictionaryCardProps) {
    return (
        <article className="group overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition hover:border-green-500 hover:shadow-md">
            <div className="relative h-44 w-full overflow-hidden bg-muted">
                <DictionaryMedia entry={entry} />
            </div>

            <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-xs text-muted-foreground">{entry.query}</p>
                        <h3 className="truncate text-base font-semibold">
                            {entry.translation}
                        </h3>
                    </div>
                </div>

                {entry.tags && entry.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {entry.tags.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => onTagClick?.(t)}
                                className="rounded-full border border-green-500/25 bg-green-500/10 px-2.5 py-1 text-[11px] text-green-700 hover:bg-green-500/15 dark:text-green-400"
                                title="Filter by this tag"
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">No tags</p>
                )}
            </div>
        </article>
    );
}