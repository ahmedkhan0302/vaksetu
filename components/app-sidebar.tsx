"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command, Compass,
  Frame,
  GalleryVerticalEnd, Languages,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { AppHeader } from "@/components/app-header"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Translate",
      url: "/",
      icon: Languages,
      isActive: true,
    },
    {
      title: "Explore",
      url: "/explore",
      icon: Compass,
      items: [
        {
          title: "Resources",
          url: "#",
        },
        {
          title: "Quiz",
          url: "/explore/quiz",
        },
        {
          title: "Leaderboard",
          url: "/explore/leaderboard",
        },
        {
          title: "Community",
          url: "#",
        },
        {
          title: "Dictionary",
          url: "/explore/dictionary",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Community",
          url: "#",
        },
      ],
    },
  ],
}

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: { name: string, email: string, avatar: string } | null }) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppHeader />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
