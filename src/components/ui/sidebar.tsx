"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type SidebarContextValue = {
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [openMobile, setOpenMobile] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <SidebarContext.Provider value={{ openMobile, setOpenMobile, isMobile }}>
      <div className="flex min-h-screen w-full">{children}</div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "hidden shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:w-64 md:flex-col",
          className
        )}
      >
        {children}
      </aside>
      {/* Mobile — Sheet */}
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <div className="flex h-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function SidebarHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-1 border-b px-4 py-4", className)}>{children}</div>;
}

export function SidebarContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-thin flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SidebarFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mt-auto border-t px-3 py-3", className)}>{children}</div>;
}

export function SidebarGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-1", className)}>{children}</div>;
}

export function SidebarGroupLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SidebarMenu({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <ul className={cn("flex flex-col gap-0.5", className)}>{children}</ul>;
}

export function SidebarMenuItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <li className={cn("list-none", className)}>{children}</li>;
}

export function SidebarMenuButton({
  children,
  isActive,
  asChild,
  className,
  ...props
}: React.ComponentProps<"button"> & { isActive?: boolean; asChild?: boolean }) {
  const base = cn(
    "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
    "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    isActive &&
      "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-r-full before:bg-sidebar-primary",
    className
  );
  if (asChild) {
    return (
      <span
        className={base}
        data-active={isActive ? "" : undefined}
        {...(props as React.HTMLAttributes<HTMLSpanElement>)}
      >
        {children}
      </span>
    );
  }
  return (
    <button className={base} {...props}>
      {children}
    </button>
  );
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={() => setOpenMobile(true)}
    >
      <Menu className="h-4 w-4" />
      <span className="sr-only">Abrir navegación</span>
    </Button>
  );
}

export function SidebarInset({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-screen flex-1 flex-col bg-background", className)}>
      {children}
    </div>
  );
}
