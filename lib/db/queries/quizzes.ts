import { inArray, eq } from 'drizzle-orm';
import { db } from '../index';
import { quiz, glosses } from '../schema';

type Difficulty = "EASY" | "MEDIUM" | "HARD";

// This interface reflects the JSON structure stored in the DB `content` field
interface DBQuestion {
    q_no: number;
    q_text?: string;
    q_gloss_id: number;
    options: number[];
}

/**
 * Fetches all quizzes returning only metadata to list them.
 */
export async function getQuizzesList() {
    const allQuizzes = await db.select({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        type: quiz.type,
    }).from(quiz);

    return allQuizzes;
}

/**
 * Fetches a specific quiz and hydrates the options and signs with names and images.
 */
export async function getQuizById(id: string) {
    // Fetch the specific quiz
    const q = await db.select().from(quiz).where(eq(quiz.id, id)).limit(1);
    if (q.length === 0) return null;

    const quizRecord = q[0];
    const content = quizRecord.content as { questions: DBQuestion[] };
    const dbQuestions = content.questions || [];

    // Collect all unique gloss IDs needed for hydration
    const glossIdsToFetch = new Set<number>();
    for (const question of dbQuestions) {
        glossIdsToFetch.add(question.q_gloss_id);
        for (const opt of question.options) {
            glossIdsToFetch.add(opt);
        }
    }

    // Handle empty options gracefully
    if (glossIdsToFetch.size === 0) {
        return {
            ...quizRecord,
            questions: []
        };
    }

    // Fetch glosses in one batch
    const foundGlosses = await db
        .select({
            id: glosses.id,
            glossName: glosses.glossName,
        })
        .from(glosses)
        .where(inArray(glosses.id, Array.from(glossIdsToFetch).map(id => BigInt(id))));

    // Map glosses for easy O(1) lookup
    const glossMap = new Map<number, { name: string, image_url: string }>();
    for (const g of foundGlosses) {
        const numericId = Number(g.id);
        glossMap.set(numericId, {
            name: g.glossName,
            // Default to the predefined naming standard given by the user 
            image_url: `/glosses/${g.glossName}.jpg`
        });
    }

    // Hydrate questions based on their type
    const hydratedQuestions = dbQuestions.map(dbq => {
        const qType = quizRecord.type; // Taken straight from the quiz parent row

        if (qType === 'image_mcq') {
            const correctName = glossMap.get(dbq.q_gloss_id)?.name || 'Unknown';
            // Determine display text: if dbq.q_text is short, append the name
            let displayText = dbq.q_text || "Identify the correct sign";
            if (!displayText.includes(correctName) && !displayText.includes("'")) {
                displayText = `${displayText} for '${correctName}'`;
            }

            return {
                q_no: dbq.q_no,
                q_text: displayText,
                correct_id: dbq.q_gloss_id,
                options: dbq.options.map(optId => ({
                    id: optId,
                    name: glossMap.get(optId)?.name || 'Unknown',
                    image_url: glossMap.get(optId)?.image_url
                }))
            };
        } else {
            // sign_mcq
            return {
                q_no: dbq.q_no,
                question_image: glossMap.get(dbq.q_gloss_id)?.image_url || '',
                correct_id: dbq.q_gloss_id,
                options: dbq.options.map(optId => ({
                    id: optId,
                    name: glossMap.get(optId)?.name || 'Unknown'
                }))
            };
        }
    });

    return {
        id: quizRecord.id,
        title: quizRecord.title,
        description: quizRecord.description,
        difficulty: quizRecord.difficulty as Difficulty,
        type: quizRecord.type as "image_mcq" | "sign_mcq",
        questions: hydratedQuestions
    };
}
