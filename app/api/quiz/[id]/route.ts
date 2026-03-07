import { NextRequest, NextResponse } from 'next/server';
import { getQuizById } from '@/lib/db/queries/quizzes';

// A dynamic GET endpoint that takes the { id } as part of the resolved params promise
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await context.params).id;
        const quiz = await getQuizById(id);

        if (!quiz) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        return NextResponse.json(quiz);
    } catch (e) {
        console.error("Error fetching quiz by ID:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
