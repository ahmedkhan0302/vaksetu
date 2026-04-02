"use client";

import React from "react";

export type DictionaryEntry = {
    id: string;
    query: string;
    translation: string;
    signImageUrl: string;
    tags?: string[];
};

type DictionaryCardProps = {
    entry: DictionaryEntry;
    onTagClick?: (tag: string) => void;
};

export function DictionaryCard({ entry, onTagClick }: DictionaryCardProps) {
    return (
        <article className="group overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition hover:shadow-md hover:border-b-3 hover:border-green-500">
            <div className="relative h-44 w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={entry.signImageUrl}
                    alt={`Sign for ${entry.translation}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                />
            </div>

            <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-xs text-muted-foreground">{entry.query}</p>
                        <h3 className="truncate text-base font-semibold">{entry.translation}</h3>
                    </div>
                </div>

                {entry.tags && entry.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {entry.tags.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => onTagClick?.(t)}
                                className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] text-primary hover:bg-primary/15"
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