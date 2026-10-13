"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { login, type FormState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/section-card";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, null);

  return (
    <SectionCard title="Iniciar sesión">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Usuario</Label>
          <Input
            id="name"
            name="name"
            autoComplete="username"
            autoCapitalize="none"
            required
            maxLength={40}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
        </div>

        {state?.error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          <LogIn className="h-4 w-4" />
          {pending ? "Verificando..." : "Ingresar"}
        </Button>
      </form>
    </SectionCard>
  );
}
