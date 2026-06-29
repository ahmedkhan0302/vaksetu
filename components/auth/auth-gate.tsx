"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { LoginBlocker } from "@/components/auth/login-blocker"

export function AuthGate({ children }: { children: React.ReactNode }) {
    // DEV BYPASS: Skip auth when running in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"
    
    const [authed, setAuthed] = React.useState(isMockMode)
    const [checked, setChecked] = React.useState(isMockMode)
    const supabase = createClient()

    React.useEffect(() => {
        if (isMockMode) return // Skip auth check in mock mode
        
        console.log("AuthGate: checkAuth started")
        async function checkAuth() {
            try {
                console.log("AuthGate: calling supabase.auth.getUser()...")
                const result = await supabase.auth.getUser()
                console.log("AuthGate: supabase.auth.getUser() completed:", result)
                const user = result.data?.user
                setAuthed(!!user)
                setChecked(true)
            } catch (err) {
                console.error("AuthGate: Error in checkAuth:", err)
                setChecked(true)
            }
        }
        checkAuth()
        
        console.log("AuthGate: registering onAuthStateChange...")
        const { data: authListener } = supabase.auth.onAuthStateChange((event: any, session: any) => {
            console.log("AuthGate: onAuthStateChange triggered:", event, session?.user)
            setAuthed(!!session?.user)
        })

        return () => {
            console.log("AuthGate: unsubscribing authListener...")
            authListener.subscription.unsubscribe()
        }
    }, [supabase, isMockMode])

    return (
        <>
            {authed ? children : null}
            {checked && !authed ? <LoginBlocker onAuthed={() => setAuthed(true)} /> : null}
        </>
    )
}