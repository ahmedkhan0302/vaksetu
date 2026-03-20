export type AuthUser = { id: string; email: string } | null

const LS_KEY = "vaksetu_auth_user"

export function getClientUser(): AuthUser {
    if (typeof window === "undefined") return null
    try {
        const raw = localStorage.getItem(LS_KEY)
        return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
        return null
    }
}

export function setClientUser(user: AuthUser) {
    if (typeof window === "undefined") return
    if (!user) localStorage.removeItem(LS_KEY)
    else localStorage.setItem(LS_KEY, JSON.stringify(user))
}

export function isAuthed(): boolean {
    return !!getClientUser()
}