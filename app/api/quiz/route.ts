import { NextResponse } from 'next/server';
import { getQuizzesList } from '@/lib/db/queries/quizzes';

export async function GET() {
    try {
        const quizzes = await getQuizzesList();
        return NextResponse.json(quizzes);
    } catch (e) {
        console.error("Error fetching quizzes:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
