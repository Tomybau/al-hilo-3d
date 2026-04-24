"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Coins,
  Factory,
  Home,
  Package,
  Settings,
  ShoppingCart,
  Disc3,
  UserCircle2,
} from "lucide-react";
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
];

export function AppSidebar({ user }: { user: { id: number; name: string } | null }) {
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
            <Link href="/quien-soy" className="block">
              <SidebarMenuButton asChild isActive={isActive("/quien-soy")}>
                <>
                  <UserCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user ? user.name : "Identificarme"}</span>
                </>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
