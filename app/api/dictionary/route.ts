import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
    const assetsDir = path.join(process.cwd(), "public", "Glosses", "Videos", "assets");
    const entriesFilePath = path.join(process.cwd(), "public", "dictionary", "entries.json");

    try {
        // 1. Load the base static metadata entries
        let baseEntries: any[] = [];
        if (fs.existsSync(entriesFilePath)) {
            const fileContent = fs.readFileSync(entriesFilePath, "utf-8");
            baseEntries = JSON.parse(fileContent);
        }

        // Map base entries by uppercase query / id for quick lookup
        const baseMap = new Map<string, any>();
        for (const entry of baseEntries) {
            baseMap.set(entry.query.toUpperCase().trim(), entry);
        }

        // 2. Scan active assets directory
        const activeEntries: any[] = [];
        const foundQueries = new Set<string>();

        if (fs.existsSync(assetsDir)) {
            const files = fs.readdirSync(assetsDir);
            for (const file of files) {
                const ext = path.extname(file).toLowerCase();
                if ([".mp4", ".mkv", ".webm"].includes(ext)) {
                    const wordName = path.basename(file, ext).toUpperCase().trim();
                    if (!wordName) continue;

                    const videoUrl = `/Glosses/Videos/assets/${file}`;
                    foundQueries.add(wordName);

                    // Support mapping space-separated or underscore versions
                    const normalizedSearchKeys = [
                        wordName,
                        wordName.replace(/_/g, " "),
                        wordName.replace(/ /g, "_")
                    ];

                    let matchedEntry: any = null;
                    for (const key of normalizedSearchKeys) {
                        if (baseMap.has(key)) {
                            matchedEntry = { ...baseMap.get(key) };
                            break;
                        }
                    }

                    if (matchedEntry) {
                        // Bind actual video filename
                        matchedEntry.signVideoUrl = videoUrl;
                        activeEntries.push(matchedEntry);
                    } else {
                        // Generate a clean dynamic dictionary entry
                        const isAlphabet = wordName.length === 1 && /[A-Z]/.test(wordName);
                        const isNumber = wordName.length === 1 && /[0-9]/.test(wordName);

                        let tags = ["words"];
                        if (isAlphabet) tags = ["alphabet"];
                        else if (isNumber) tags = ["numbers"];

                        let translation = wordName.replace(/_/g, " ");
                        if (translation.endsWith(" NOUN")) {
                            translation = translation.replace(" NOUN", " (Noun)");
                        } else if (translation.endsWith(" VERB")) {
                            translation = translation.replace(" VERB", " (Verb)");
                        }
                        
                        // Capitalize translation nicely
                        translation = translation.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());

                        const id = wordName.toLowerCase().replace(/_/g, "-");
                        const query = wordName.replace(/_/g, " ");

                        const newEntry: any = {
                            id,
                            query,
                            translation,
                            signVideoUrl: videoUrl,
                            tags
                        };

                        // Optional signImageUrl fallback check
                        const imgPath = path.join(process.cwd(), "public", "Glosses", `${wordName}.jpg`);
                        if (fs.existsSync(imgPath)) {
                            newEntry.signImageUrl = `/Glosses/${wordName}.jpg`;
                        }

                        activeEntries.push(newEntry);
                    }
                }
            }
        }

        return NextResponse.json(activeEntries);
    } catch (error) {
        console.error("Error generating dynamic dictionary:", error);
        return NextResponse.json({ error: "Failed to load dictionary entries" }, { status: 500 });
    }
}
