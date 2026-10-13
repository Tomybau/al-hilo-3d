import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

  if (!user) {
    // El middleware ya frena a quien no tiene una cookie firmada, pero no puede ver
    // la base. Una cookie vieja (de antes de un cambio de contrasena o de una
    // desactivacion) pasa el middleware: aca se la manda al login para que tampoco
    // pueda LEER, no solo que no pueda escribir. El header lo pone el middleware y
    // siempre lo sobrescribe, asi que el cliente no lo puede falsificar para saltear
    // esto (y falsificarlo solo agregaria una redireccion, nunca la quitaria).
    const pathname = (await headers()).get("x-alh-pathname");
    if (pathname && pathname !== "/login") redirect("/login");

    // La unica pagina que se muestra sin sesion es /login, y sin el menu lateral.
    return (
      <html lang="es" className={inter.variable}>
        <body className="min-h-screen bg-background font-sans text-sm text-foreground">
          <main className="px-4 py-6">{children}</main>
        </body>
      </html>
    );
  }

  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-sm text-foreground">
        <SidebarProvider>
          <AppSidebar user={{ id: user.id, name: user.name }} />
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
