"use client"

import * as React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { setClientUser } from "@/lib/auth/client"

type Mode = "login" | "signup"

export function LoginBlocker({ onAuthed }: { onAuthed: () => void }) {
    const [mode, setMode] = React.useState<Mode>("login")
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")

    const isSignup = mode === "signup"

    React.useEffect(() => {
        // prevent scrolling behind modal
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = ""
        }
    }, [])

    function validate() {
        if (!email.trim()) return "Email is required."
        if (!password) return "Password is required."
        if (isSignup) {
            if (password.length < 6) return "Password must be at least 6 characters."
            if (password !== confirmPassword) return "Passwords do not match."
        }
        return null
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        const validationError = validate()
        if (validationError) {
            setError(validationError)
            return
        }

        setLoading(true)
        try {
            await new Promise((r) => setTimeout(r, 500))
            setClientUser({ id: "demo-user", email })
            onAuthed()
        } catch (err: unknown) {
            const e = err as { message?: string }
            setError(e.message ?? "Login failed.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4" aria-modal="true" role="dialog">
            <Card className="w-full max-w-md border-green-500/20">
                <CardHeader>
                    <CardTitle className="text-2xl">Login required</CardTitle>
                    <CardDescription>Please log in to continue.</CardDescription>
                </CardHeader>

                <CardContent>
                    <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login" className="data-[state=active]:bg-green-800 data-[state=active]:text-white">
                                Login
                            </TabsTrigger>
                            <TabsTrigger value="signup" className="data-[state=active]:bg-green-800 data-[state=active]:text-white">
                                Sign up
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {error ? (
                        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
                            {error}
                        </div>
                    ) : null}

                    <form onSubmit={onSubmit} className="mt-4 grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="lb-email">Email</Label>
                            <Input
                                id="lb-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="focus-visible:ring-green-950"
                                autoComplete="email"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="lb-password">Password</Label>
                            <Input
                                id="lb-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="focus-visible:ring-green-950"
                                autoComplete={isSignup ? "new-password" : "current-password"}
                                required
                            />
                        </div>

                        {isSignup ? (
                            <div className="grid gap-2">
                                <Label htmlFor="lb-confirm">Confirm password</Label>
                                <Input
                                    id="lb-confirm"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="focus-visible:ring-green-950"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        ) : null}

                        <Button className="bg-green-800 hover:bg-green-950" type="submit" disabled={loading}>
                            {loading ? "Please wait..." : isSignup ? "Create account" : "Login"}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            className="border-green-800 text-green-800 hover:bg-green-600 hover:text-white"
                            disabled={loading}
                            onClick={async () => {
                                setLoading(true)
                                await new Promise((r) => setTimeout(r, 300))
                                setClientUser({ id: "demo-user", email: "google@example.com" })
                                onAuthed()
                                setLoading(false)
                            }}
                        >
                            Continue with Google (placeholder)
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}