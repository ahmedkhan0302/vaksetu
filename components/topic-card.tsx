import Link from "next/link"

type TopicCardProps = {
    title: string
    description: string
    imageUrl: string
    href?: string
}

export function TopicCard({ title, description, imageUrl, href }: TopicCardProps) {
    const CardInner = (
        <article
            className={[
                "group relative overflow-hidden rounded-xl border-3",
                "border-green-800 bg-card shadow-sm",
                "transition-all duration-200 ease-out",
                "hover:-translate-y-1 hover:border-green-600 hover:shadow-lg",
                "hover:ring-4 hover:ring-green-400/20",
                "focus-within:ring-4 focus-within:ring-green-400/25",
            ].join(" ")}
        >
            {/* Square tile */}
            <div className="relative aspect-square w-full">
                {/* Background image */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                />

                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-black/35 transition group-hover:bg-black/20" />

                {/* Content pinned to bottom */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="text-xl font-semibold leading-tight text-white">
                        {title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-base text-white/85">
                        {description}
                    </p>
                </div>
            </div>
        </article>
    )

    if (href) {
        return (
            <Link
                href={href}
                className="block rounded-xl focus:outline-none"
                aria-label={title}
            >
                {CardInner}
            </Link>
        )
    }

    return CardInner
}