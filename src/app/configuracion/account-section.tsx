"use client";

import { useActionState, useRef } from "react";
import { changeOwnPassword, type FormState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/section-card";

export function AccountSection({ name }: { name: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const result = await changeOwnPassword(prev, fd);
    if (result?.ok) formRef.current?.reset();
    return result;
  }, null);

  return (
    <SectionCard
      title={`Mi cuenta — ${name}`}
      description="Al cambiar la contraseña se cierra tu sesión en los demás dispositivos."
    >
      <form ref={formRef} action={action} className="flex max-w-sm flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="current">Contraseña actual</Label>
          <Input id="current" name="current" type="password" autoComplete="current-password" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña nueva</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Repetir contraseña nueva</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state?.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Guardando..." : "Cambiar contraseña"}
        </Button>
      </form>
    </SectionCard>
  );
}
