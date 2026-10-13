import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { safeNext } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);

  // Si ya hay una sesion valida, no tiene sentido mostrar el login.
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-[400px] flex-col justify-center gap-6 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Al Hilo 3D</h1>
          <p className="text-sm text-muted-foreground">Ingresá con tu usuario y contraseña.</p>
        </div>
      </div>
      <LoginForm next={next} />
    </div>
  );
}
