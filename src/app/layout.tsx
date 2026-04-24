import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/current-user";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Al Hilo 3D",
  description: "Sistema de gestión interna",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-sm text-foreground">
        <SidebarProvider>
          <AppSidebar user={user ? { id: user.id, name: user.name } : null} />
          <SidebarInset>
            <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur md:hidden">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-5" />
              <span className="font-semibold tracking-tight">Al Hilo 3D</span>
            </header>
            <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
              <div className="mx-auto w-full max-w-[1400px]">{children}</div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
