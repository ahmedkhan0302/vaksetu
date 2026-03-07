import { config } from 'dotenv';
config({ path: '.env.local' });
import { getQuizzesList, getQuizById } from '../lib/db/queries/quizzes';

async function run() {
    console.log("--- FETCHING QUIZZES LIST ---");
    const list = await getQuizzesList();
    console.log(list);

    if (list.length > 0) {
        console.log("\n--- FETCHING FULLY HYDRATED QUIZ ---");
        const first = list[0].id;
        const full = await getQuizById(first);
        console.dir(full, { depth: null });
    }
    process.exit(0);
}

run();
