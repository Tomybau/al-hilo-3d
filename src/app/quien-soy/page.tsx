import { UserCircle2, UserPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { createUser, selectUser } from "@/server/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/section-card";

export const dynamic = "force-dynamic";

export default async function QuienSoyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-[420px] flex-col justify-center gap-5 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">¿Quién sos?</h1>
          <p className="text-sm text-muted-foreground">
            Elegí tu nombre para registrar quién hace cada cambio. Sin contraseña.
          </p>
        </div>
      </div>

      {users.length > 0 && (
        <SectionCard title="Elegir usuario">
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <form key={u.id} action={selectUser}>
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="next" value={sp.next ?? "/"} />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                  {u.name}
                </Button>
              </form>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Crear nuevo usuario"
        description="Se usa solo para identificar quién registra cada operación."
      >
        <form action={createUser} className="flex gap-2">
          <Input name="name" placeholder="Tu nombre" required maxLength={40} />
          <Button type="submit">
            <UserPlus className="h-4 w-4" /> Crear
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
