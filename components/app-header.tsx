"use client"

import * as React from "react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppHeader() {
  return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="pointer-events-none">
            {/* Logo */}
            <div className="bg-green-900 text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              {/* Replace with your actual logo component/image */}
              <span className="text-sm font-bold">V</span>
            </div>

            {/* App name */}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Vaksetu</span>
              <span className="truncate text-xs text-muted-foreground">
              Bridging the Gaps
            </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
  )
}