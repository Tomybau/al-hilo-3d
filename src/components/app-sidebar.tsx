"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart2,
  Coins,
  Factory,
  Home,
  Package,
  Settings,
  ShoppingCart,
  Disc3,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { logout } from "@/server/actions/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const OPERACION = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/juguetes", label: "Juguetes", icon: Package },
  { href: "/filamentos", label: "Filamentos", icon: Disc3 },
];

const NEGOCIO = [
  { href: "/finanzas", label: "Finanzas", icon: Coins },
  { href: "/impresoras", label: "Impresoras", icon: Factory },
  { href: "/metricas", label: "Métricas", icon: BarChart2 },
  { href: "/actividad", label: "Actividad", icon: Activity },
];

export function AppSidebar({ user }: { user: { id: number; name: string } }) {
  const pathname = usePathname() ?? "/";
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Disc3 className="h-4 w-4" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Al Hilo 3D</span>
            <span className="text-[11px] text-muted-foreground">Gestión interna</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operación</SidebarGroupLabel>
          <SidebarMenu>
            {OPERACION.map((n) => {
              const Icon = n.icon;
              const active = isActive(n.href);
              return (
                <SidebarMenuItem key={n.href}>
                  <Link href={n.href} className="block">
                    <SidebarMenuButton asChild isActive={active}>
                      <>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{n.label}</span>
                      </>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Negocio</SidebarGroupLabel>
          <SidebarMenu>
            {NEGOCIO.map((n) => {
              const Icon = n.icon;
              const active = isActive(n.href);
              return (
                <SidebarMenuItem key={n.href}>
                  <Link href={n.href} className="block">
                    <SidebarMenuButton asChild isActive={active}>
                      <>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{n.label}</span>
                      </>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/configuracion" className="block">
              <SidebarMenuButton asChild isActive={isActive("/configuracion")}>
                <>
                  <Settings className="h-4 w-4 shrink-0" />
                  <span>Configuración</span>
                </>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/configuracion?tab=cuenta" className="block" title="Mi cuenta">
              <SidebarMenuButton asChild>
                <>
                  <UserCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user.name}</span>
                </>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logout}>
              <SidebarMenuButton type="submit" className="w-full text-muted-foreground">
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Cerrar sesión</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
