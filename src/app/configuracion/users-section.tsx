"use client";

import { useActionState, useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { createUser, deactivateUser, setUserPassword } from "@/server/actions/users";
import type { FormState } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/section-card";

/** Lo unico que llega al navegador: nunca el hash de la contrasena. */
export type UserRow = { id: number; name: string; active: boolean; hasPassword: boolean };

function Feedback({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="text-sm text-destructive">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-emerald-700">{state.ok}</p>;
  return null;
}

function SetPasswordForm({ user, onDone }: { user: UserRow; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const result = await setUserPassword(prev, fd);
    if (result?.ok) onDone();
    return result;
  }, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2 pt-2">
      <input type="hidden" name="userId" value={user.id} />
      <Input
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder={`Nueva contraseña para ${user.name}`}
        minLength={8}
        required
        className="h-8 w-64"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function UsersSection({ users, currentUserId }: { users: UserRow[]; currentUserId: number }) {
  const [createState, createAction, creating] = useActionState<FormState, FormData>(createUser, null);
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <SectionCard
      title={`Usuarios (${users.length})`}
      description="Quiénes pueden entrar al sistema. Cada uno con su contraseña."
    >
      <form action={createAction} className="mb-2 flex flex-wrap gap-2">
        <Input name="name" placeholder="Nombre" required maxLength={40} className="w-44" />
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Contraseña inicial (mín. 8)"
          minLength={8}
          required
          className="w-56"
        />
        <Button type="submit" disabled={creating}>
          <Plus className="h-4 w-4" /> Crear
        </Button>
      </form>
      <div className="mb-4">
        <Feedback state={createState} />
      </div>

      <ul className="divide-y">
        {users.map((u) => (
          <li key={u.id} className="py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={u.active ? "font-medium" : "text-muted-foreground line-through"}>
                  {u.name}
                </span>
                {u.id === currentUserId && <Badge variant="secondary">vos</Badge>}
                {u.active && !u.hasPassword && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    sin contraseña: no puede entrar
                  </Badge>
                )}
              </div>
              {u.active && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(editing === u.id ? null : u.id)}
                  >
                    <KeyRound className="h-4 w-4" />
                    {u.hasPassword ? "Cambiar contraseña" : "Asignar contraseña"}
                  </Button>
                  {u.id !== currentUserId && (
                    <form action={deactivateUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Desactivar
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
            {editing === u.id && <SetPasswordForm user={u} onDone={() => setEditing(null)} />}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
