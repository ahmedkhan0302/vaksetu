import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from './index';
import { quiz } from './schema';

/**
 * Fetches all quizzes from the database.
 */
export async function getAllQuizzes() {
    console.log("Fetching all quizzes...");
    const allQuizzes = await db.select().from(quiz);

    console.log("\n--- All Quizzes ---");
    console.dir(allQuizzes, { depth: null });
    console.log("-------------------\n");

    return allQuizzes;
}

// Execute the function if this file is run directly (e.g., via `npx tsx lib/db/queries.ts`)
const isMainModule = typeof require !== 'undefined' && require.main === module;
const isExecutedDirectly = typeof process !== 'undefined' && process.argv[1]?.endsWith('queries.ts');

if (isMainModule || isExecutedDirectly) {
    getAllQuizzes()
        .then(() => {
            console.log("Successfully fetched quizzes.");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Error fetching quizzes:", error);
            process.exit(1);
        });
}
