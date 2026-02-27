"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Compass } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type Difficulty = "EASY" | "MEDIUM" | "HARD"

type BaseQuiz = {
    id: string
    title: string
    description: string
    difficulty: Difficulty
    type: "image_mcq" | "sign_mcq"
}

type ImageMCQQuestion = {
    q_no: number
    q_text: string
    correct_id: number
    options: { id: number; image_url?: string; name: string }[]
}

type SignMCQQuestion = {
    q_no: number
    question_image: string
    correct_id: number
    options: { id: number; name: string }[]
}

type ImageMCQ = BaseQuiz & {
    type: "image_mcq"
    questions: ImageMCQQuestion[]
}

type SignMCQ = BaseQuiz & {
    type: "sign_mcq"
    questions: SignMCQQuestion[]
}

type Quiz = ImageMCQ | SignMCQ

/**
 * Adjust this ONE function to match how your files are named in /public/glosses.
 * Examples:
 *  - /public/glosses/28.jpg  -> return `/glosses/${id}.jpg`
 *  - /public/glosses/28.png  -> return `/glosses/${id}.png`
 *  - /public/glosses/28.jpeg -> return `/glosses/${id}.jpeg`
 */
function glossImageUrlById(id: number) {
    return `/glosses/${id}.jpg`
}

const DUMMY_QUIZZES: Quiz[] = [
    {
        id: "5b3e3bee-cefe-41df-bb9d-ca8ab009e52d",
        title: "Beginner Numbers 1",
        description: "Basic number practice",
        difficulty: "EASY",
        type: "image_mcq",
        questions: [
            {
                q_no: 1,
                q_text: "Identify the correct sign for '6'",
                correct_id: 6,
                options: [
                    { id: 8, name: "8" },
                    { id: 3, name: "3" },
                    { id: 7, name: "7" },
                    { id: 6, name: "6" },
                ],
            },
            {
                q_no: 2,
                q_text: "Identify the correct sign for '2'",
                correct_id: 5,
                options: [
                    { id: 1, name: "1" },
                    { id: 9, name: "9" },
                    { id: 5, name: "5" },
                    { id: 2, name: "2" },
                ],
            },
        ],
    },
    {
        id: "0f2b6f6d-2a2e-4c7d-9d5e-1f5e2f0a0001",
        title: "Identify the sign (demo)",
        description: "Sign image -> choose the correct gloss (sample labels)",
        difficulty: "EASY",
        type: "sign_mcq",
        questions: [
            {
                q_no: 1,
                // If your sign_mcq questions also come from gloss ids later,
                // you can use the same helper: question_image: glossImageUrlById(101)
                question_image: "/glosses/Z.jpg",
                correct_id: 103,
                options: [
                    { id: 101, name: "Q" },
                    { id: 102, name: "R" },
                    { id: 103, name: "Z" },
                    { id: 104, name: "P" },
                ],
            },
            {
                q_no: 2,
                question_image: "/glosses/Y.jpg",
                correct_id: 102,
                options: [
                    { id: 101, name: "U" },
                    { id: 102, name: "Y" },
                    { id: 105, name: "N" },
                    { id: 106, name: "G" },
                ],
            },
        ],
    },
]

type AnswerMap = Record<number, number | null>

function computeResults(quiz: Quiz, answers: AnswerMap) {
    let correct = 0
    let wrong = 0
    let unanswered = 0

    for (const q of quiz.questions) {
        const selected = answers[q.q_no]
        if (selected == null) unanswered++
        else if (selected === q.correct_id) correct++
        else wrong++
    }

    return { correct, wrong, unanswered, total: quiz.questions.length }
}

function optionLetter(index: number) {
    return String.fromCharCode("A".charCodeAt(0) + index)
}

export default function QuizPage() {
    const [quizIndex, setQuizIndex] = React.useState(0)
    const quiz = DUMMY_QUIZZES[quizIndex]

    const [questionIndex, setQuestionIndex] = React.useState(0)
    const [answers, setAnswers] = React.useState<AnswerMap>(() =>
        Object.fromEntries(quiz.questions.map((q) => [q.q_no, null]))
    )
    const [showResults, setShowResults] = React.useState(false)

    React.useEffect(() => {
        setQuestionIndex(0)
        setAnswers(Object.fromEntries(quiz.questions.map((q) => [q.q_no, null])))
        setShowResults(false)
    }, [quiz.id])

    const results = React.useMemo(() => computeResults(quiz, answers), [quiz, answers])

    const progressPct = Math.round(((questionIndex + 1) / quiz.questions.length) * 100)
    const isLastQuestion = questionIndex === quiz.questions.length - 1

    function selectOption(qNo: number, optionId: number) {
        setAnswers((prev) => ({ ...prev, [qNo]: optionId }))
    }

    function nextQuestion() {
        if (questionIndex < quiz.questions.length - 1) setQuestionIndex((i) => i + 1)
        else setShowResults(true)
    }

    function prevQuestion() {
        if (questionIndex > 0) setQuestionIndex((i) => i - 1)
    }

    function resetQuizAttempt() {
        setQuestionIndex(0)
        setAnswers(Object.fromEntries(quiz.questions.map((q) => [q.q_no, null])))
        setShowResults(false)
    }

    function goToNextQuiz() {
        const hasNext = quizIndex < DUMMY_QUIZZES.length - 1
        if (!hasNext) return
        setQuizIndex((i) => i + 1)
    }

    const canGoNextQuiz = results.correct >= Math.ceil(results.total / 2)
    const hasNextQuiz = quizIndex < DUMMY_QUIZZES.length - 1

    const header = (
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                <Compass className="size-4 text-muted-foreground" />
                <h1 className="text-lg font-semibold leading-none">Quiz</h1>
            </div>
        </header>
    )

    if (showResults) {
        return (
            <>
                {header}

                <div className="flex flex-1 flex-col p-4 pt-0">
                    <div className="mx-auto w-full max-w-3xl">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-2xl font-semibold">Results</h2>
                                <p className="text-sm text-muted-foreground">{quiz.title}</p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {results.correct}/{results.total} correct
                            </div>
                        </div>

                        <Card className="mt-4 border-green-500/30 p-5">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                                    <div className="text-sm text-muted-foreground">Correct</div>
                                    <div className="text-3xl font-semibold text-green-600">{results.correct}</div>
                                </div>

                                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                                    <div className="text-sm text-muted-foreground">Wrong</div>
                                    <div className="text-3xl font-semibold">{results.wrong}</div>
                                </div>

                                <div className="rounded-lg border p-4">
                                    <div className="text-sm text-muted-foreground">Unanswered</div>
                                    <div className="text-3xl font-semibold">{results.unanswered}</div>
                                </div>

                                <div className="rounded-lg border p-4">
                                    <div className="text-sm text-muted-foreground">Total</div>
                                    <div className="text-3xl font-semibold">{results.total}</div>
                                </div>
                            </div>

                            {!canGoNextQuiz ? (
                                <p className="mt-4 text-sm text-muted-foreground">
                                    Score at least{" "}
                                    <span className="font-medium text-green-700">{Math.ceil(results.total / 2)}</span>{" "}
                                    correct to unlock the next quiz.
                                </p>
                            ) : null}

                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <Button
                                    variant="secondary"
                                    onClick={resetQuizAttempt}
                                    className="border border-green-500/30"
                                >
                                    Try again
                                </Button>

                                <Button asChild className="bg-green-600 hover:bg-green-700">
                                    <Link href="/explore/leaderboard">Visit leaderboard</Link>
                                </Button>

                                <Button
                                    onClick={goToNextQuiz}
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={!hasNextQuiz || !canGoNextQuiz}
                                >
                                    Next
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            {header}

            <div className="flex flex-1 flex-col p-4 pt-0">
                <div className="mx-auto w-full max-w-3xl">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-semibold">{quiz.title}</h2>
                            <p className="text-sm text-muted-foreground">{quiz.description}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Q{questionIndex + 1}/{quiz.questions.length} • Quiz {quizIndex + 1}/{DUMMY_QUIZZES.length}
                        </div>
                    </div>

                    <div className="mt-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-green-600 transition-[width] duration-300 ease-out"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <div className="mt-1 text-right text-xs text-muted-foreground">{progressPct}%</div>
                    </div>

                    <Card className="mt-4 p-5">
                        {quiz.type === "image_mcq" ? (
                            (() => {
                                const current = quiz.questions[questionIndex]
                                const selected = answers[current.q_no]

                                return (
                                    <>
                                        <div className="text-sm text-muted-foreground">Question {current.q_no}</div>
                                        <div className="mt-1 text-lg font-semibold">{current.q_text}</div>

                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            {current.options.map((opt, optIndex) => {
                                                const isSelected = selected === opt.id
                                                const letter = optionLetter(optIndex)

                                                // If backend provides image_url later, it will use that.
                                                // Otherwise, we derive it from gloss id based on /public/glosses.
                                                const src = opt.image_url ?? glossImageUrlById(opt.id)

                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => selectOption(current.q_no, opt.id)}
                                                        className={[
                                                            "overflow-hidden rounded-xl border text-left transition",
                                                            isSelected
                                                                ? "border-green-500 ring-4 ring-green-400/15 px-2.5"
                                                                : "hover:border-green-400/60 hover:ring-4 hover:ring-green-400/10",
                                                        ].join(" ")}
                                                    >
                                                        <div className="relative aspect-4/3 w-full bg-gray-900">
                                                            <Image
                                                                src={src}
                                                                alt={`Option ${letter}`}
                                                                fill
                                                                className="object-contain"
                                                                sizes="(min-width: 640px) 50vw, 100vw"
                                                            />
                                                            <div className="absolute left-3 top-3 rounded-full bg-green-600 px-2.5 py-1 text-xs font-semibold text-white">
                                                                {letter}
                                                            </div>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </>
                                )
                            })()
                        ) : (
                            (() => {
                                const current = quiz.questions[questionIndex]
                                const selected = answers[current.q_no]

                                return (
                                    <>
                                        <div className="text-sm text-muted-foreground">Question {current.q_no}</div>

                                        <div className="mt-4 overflow-hidden rounded-xl border border-green-500/30 bg-muted">
                                            <div className="relative aspect-video w-full bg-gray-900">
                                                <Image
                                                    src={current.question_image}
                                                    alt={`Question ${current.q_no}`}
                                                    fill
                                                    className="object-contain"
                                                    sizes="100vw"
                                                    priority={questionIndex === 0}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-3">
                                            {current.options.map((opt) => {
                                                const isSelected = selected === opt.id
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => selectOption(current.q_no, opt.id)}
                                                        className={[
                                                            "w-full rounded-lg border p-4 text-left transition",
                                                            isSelected
                                                                ? "border-green-500 bg-green-500/10"
                                                                : "hover:border-green-400/60 hover:bg-muted",
                                                        ].join(" ")}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="text-base font-medium">{opt.name}</div>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </>
                                )
                            })()
                        )}

                        <div className="mt-6 flex items-center justify-between gap-3">
                            <Button variant="secondary" onClick={prevQuestion} disabled={questionIndex === 0}>
                                Back
                            </Button>

                            <div className="flex items-center gap-2">
                                <Button variant="ghost" onClick={resetQuizAttempt}>
                                    Reset
                                </Button>

                                <Button onClick={nextQuestion} className="bg-green-600 hover:bg-green-700">
                                    {isLastQuestion ? "Finish" : "Next"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </>
    )
}