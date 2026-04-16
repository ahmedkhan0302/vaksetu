"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Compass, ChevronLeft } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

function glossImageUrlByName(name: string) {
    return `/glosses/${name}.jpg`
}

type AnswerMap = Record<number, number | null>

function computeResults(quiz: Quiz, answers: AnswerMap) {
    let correct = 0
    let wrong = 0
    let unanswered = 0

    // Only compute if quiz has valid questions array
    if (!quiz.questions || quiz.questions.length === 0) return { correct, wrong, unanswered, total: 0 }

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
    // List View State
    const [quizzesList, setQuizzesList] = React.useState<BaseQuiz[]>([])
    const [isLoadingList, setIsLoadingList] = React.useState(true)
    const [listError, setListError] = React.useState<string | null>(null)

    const [selectedQuizId, setSelectedQuizId] = React.useState<string | null>(null)

    // Live Quiz State
    const [quiz, setQuiz] = React.useState<Quiz | null>(null)
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const [questionIndex, setQuestionIndex] = React.useState(0)
    const [answers, setAnswers] = React.useState<AnswerMap>({})
    const [showResults, setShowResults] = React.useState(false)

    // Fetch Quiz List on Mount
    React.useEffect(() => {
        async function fetchList() {
            try {
                setIsLoadingList(true)
                const res = await fetch(`/api/quiz`)
                if (!res.ok) throw new Error("Failed to fetch quizzes")
                const data: BaseQuiz[] = await res.json()
                
                // Ensure data is sorted so the flow makes sense
                const sorted = data.sort((a,b) => a.title.localeCompare(b.title))
                setQuizzesList(sorted)
            } catch (err: any) {
                console.error(err)
                setListError(err.message)
            } finally {
                setIsLoadingList(false)
            }
        }

        fetchList()
    }, [])

    // Fetch specific Quiz when selected
    React.useEffect(() => {
        if (!selectedQuizId) return

        async function fetchQuiz() {
            try {
                setIsLoading(true)
                setError(null)
                const res = await fetch(`/api/quiz/${selectedQuizId}`)
                if (!res.ok) throw new Error("Failed to fetch quiz details")
                const data: Quiz = await res.json()
                setQuiz(data)

                // Reset states for the new quiz
                setQuestionIndex(0)
                
                // Fallback structure in case questions are empty
                if (data.questions && data.questions.length > 0) {
                    setAnswers(Object.fromEntries(data.questions.map((q) => [q.q_no, null])))
                } else {
                    setAnswers({})
                }
                
                setShowResults(false)
            } catch (err: any) {
                console.error(err)
                setError(err.message)
            } finally {
                setIsLoading(false)
            }
        }

        fetchQuiz()
    }, [selectedQuizId])

    const results = React.useMemo(() => {
        if (!quiz) return { correct: 0, wrong: 0, unanswered: 0, total: 0 }
        return computeResults(quiz, answers)
    }, [quiz, answers])

    // Common Header functionality
    const header = (
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
            <div className="flex items-center gap-2 px-4 w-full">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                <Compass className="size-4 text-muted-foreground shrink-0" />
                <h1 className="text-lg font-semibold leading-none mr-auto">Quizzes</h1>
                
                {selectedQuizId && (
                    <Button variant="outline" size="sm" onClick={() => setSelectedQuizId(null)} className="ml-auto">
                        <ChevronLeft className="mr-1 size-4" />
                        Exit Quiz
                    </Button>
                )}
            </div>
        </header>
    )

    // Render logic based on List vs Player
    if (!selectedQuizId) {
        return (
            <>
                {header}
                <div className="flex flex-1 flex-col p-4 pt-6">
                    <div className="mx-auto w-full max-w-5xl">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold">Available Quizzes</h2>
                            <p className="text-sm text-muted-foreground mt-1">Select a quiz to test your abilities.</p>
                        </div>
                        
                        {isLoadingList ? (
                            <div className="py-20 text-center text-muted-foreground">Loading quizzes...</div>
                        ) : listError ? (
                            <div className="py-20 text-center text-red-500">Error: {listError}</div>
                        ) : quizzesList.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground">No quizzes available</div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {quizzesList.map((q) => {
                                    const diffLower = q.difficulty.toLowerCase()
                                    const diffClass = 
                                        diffLower === 'easy' ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20' : 
                                        diffLower === 'medium' ? 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20' : 
                                        'bg-red-500/10 text-red-700 hover:bg-red-500/20'
                                    
                                    const typeName = q.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

                                    return (
                                        <Card 
                                            key={q.id} 
                                            className="flex flex-col p-5 cursor-pointer transition-all hover:border-green-500/40 hover:shadow-sm" 
                                            onClick={() => setSelectedQuizId(q.id)}
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <h3 className="font-semibold text-lg line-clamp-2 leading-tight">{q.title}</h3>
                                                <Badge variant="secondary" className={`shrink-0 ${diffClass}`}>
                                                    {q.difficulty}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-6 flex-1">{q.description}</p>
                                            <div className="flex items-center text-xs font-medium text-muted-foreground bg-muted/60 w-fit px-2.5 py-1 rounded-md">
                                                {typeName}
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </>
        )
    }

    // Now we must be in active Quiz View
    if (isLoading) {
        return (
            <>
                {header}
                <div className="p-8 text-center text-muted-foreground">Loading quiz payload...</div>
            </>
        )
    }

    if (error || !quiz) {
        return (
            <>
                {header}
                <div className="p-8 text-center text-red-500">Error: {error || "Quiz not found"}</div>
            </>
        )
    }
    
    // Safety check if quiz contains questions
    if (!quiz.questions || quiz.questions.length === 0) {
        return (
            <>
                {header}
                <div className="p-8 text-center text-muted-foreground">
                    This quiz currently has no questions configured.
                </div>
            </>
        )
    }

    const progressPct = quiz.questions.length > 0 ? Math.round(((questionIndex + 1) / quiz.questions.length) * 100) : 0
    const isLastQuestion = quiz.questions.length > 0 ? questionIndex === quiz.questions.length - 1 : false

    // To figure out if it has next quiz
    const currentIndexInList = quizzesList.findIndex(q => q.id === quiz.id)
    const hasNextQuiz = currentIndexInList !== -1 && currentIndexInList < quizzesList.length - 1

    const canGoNextQuiz = results.correct >= Math.ceil(results.total / 2)

    function selectOption(qNo: number, optionId: number) {
        setAnswers((prev) => ({ ...prev, [qNo]: optionId }))
    }

    function nextQuestion() {
        if (quiz && questionIndex < quiz.questions.length - 1) setQuestionIndex((i) => i + 1)
        else setShowResults(true)
    }

    function prevQuestion() {
        if (questionIndex > 0) setQuestionIndex((i) => i - 1)
    }

    function resetQuizAttempt() {
        if (!quiz) return
        setQuestionIndex(0)
        setAnswers(Object.fromEntries(quiz.questions.map((q) => [q.q_no, null])))
        setShowResults(false)
    }

    function goToNextQuiz() {
        if (!hasNextQuiz) return
        setSelectedQuizId(quizzesList[currentIndexInList + 1].id)
    }

    if (showResults) {
        return (
            <>
                {header}
                <div className="flex flex-1 flex-col p-4 pt-6">
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

                                {hasNextQuiz && (
                                    <Button
                                        onClick={goToNextQuiz}
                                        className="bg-green-600 hover:bg-green-700"
                                        disabled={!canGoNextQuiz}
                                    >
                                        Next Quiz
                                    </Button>
                                )}
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

            <div className="flex flex-1 flex-col p-4 pt-6">
                <div className="mx-auto w-full max-w-3xl">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-semibold">{quiz.title}</h2>
                            <p className="text-sm text-muted-foreground">{quiz.description}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Q{questionIndex + 1}/{quiz.questions.length} • Quiz {currentIndexInList + 1}/{quizzesList.length}
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

                                                const src = opt.image_url ?? glossImageUrlByName(opt.name)

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
                                                        <div className="relative aspect-4/3 w-full bg-gray-900 border-b">
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
                                                            "w-full rounded-lg border p-4 text-left transition text-sm font-medium",
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