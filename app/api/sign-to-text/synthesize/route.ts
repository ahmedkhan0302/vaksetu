import { NextResponse } from "next/server";
import { synthesizeGlossesToEnglish } from "@/lib/llm/groq-service";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { words } = body;

        if (!words || !Array.isArray(words) || words.length === 0) {
            return NextResponse.json(
                { error: "A non-empty array of recognized sign glosses ('words') is required." },
                { status: 400 }
            );
        }

        // Check if LLM synthesis is disabled (case-insensitive "false" for usellm or USE_LLM)
        const useLLMSetting = process.env.usellm || process.env.USE_LLM;
        if (useLLMSetting && useLLMSetting.toLowerCase() === "false") {
            console.log("[API sign-to-text/synthesize] LLM synthesis disabled. Returning space-joined glosses.");
            return NextResponse.json({ sentence: words.join(" ") });
        }

        const sentence = await synthesizeGlossesToEnglish(words);

        return NextResponse.json({ sentence });
    } catch (error: any) {
        console.error("[API sign-to-text/synthesize] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error during LLM synthesis." },
            { status: 500 }
        );
    }
}
