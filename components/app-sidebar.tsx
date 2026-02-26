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
  user: {
    name: "Ahmed",
    email: "ahmed@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Translate",
      url: "/",
      icon: Languages,
      isActive: true,
      items: [
        {
          title: "Sign to Speech",
          url: "#",
        },
        {
          title: "Speech to Sign",
          url: "#",
        },
      ],
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
          url: "#",
        },
        {
          title: "Community",
          url: "#",
        },
        {
          title: "Dictionary",
          url: "#",
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppHeader />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
