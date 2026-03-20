"use client"

import * as React from "react"
import { isAuthed } from "@/lib/auth/client"
import { LoginBlocker } from "@/components/auth/login-blocker"

export function AuthGate({ children }: { children: React.ReactNode }) {
    const [authed, setAuthed] = React.useState(false)
    const [checked, setChecked] = React.useState(false)

    React.useEffect(() => {
        setAuthed(isAuthed())
        setChecked(true)
    }, [])

    return (
        <>
            {children}
            {checked && !authed ? <LoginBlocker onAuthed={() => setAuthed(true)} /> : null}
        </>
    )
}