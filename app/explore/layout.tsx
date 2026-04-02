import { AuthGate } from "@/components/auth/auth-gate"

export default function ExploreLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGate>
            {children}
        </AuthGate>
    )
}
