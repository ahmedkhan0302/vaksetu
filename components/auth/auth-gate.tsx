"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { LoginBlocker } from "@/components/auth/login-blocker"

export function AuthGate({ children }: { children: React.ReactNode }) {
    const [authed, setAuthed] = React.useState(false)
    const [checked, setChecked] = React.useState(false)
    const supabase = createClient()

    React.useEffect(() => {
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser()
            setAuthed(!!user)
            setChecked(true)
        }
        checkAuth()
        
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setAuthed(!!session?.user)
        })

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [supabase])

    return (
        <>
            {children}
            {checked && !authed ? <LoginBlocker onAuthed={() => setAuthed(true)} /> : null}
        </>
    )
}