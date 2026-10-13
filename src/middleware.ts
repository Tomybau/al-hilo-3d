import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { safeNext } from "@/lib/safe-redirect";

/** Ruta pedida, para el layout. Se sobrescribe siempre: no se confia en la del cliente. */
export const PATHNAME_HEADER = "x-alh-pathname";

/**
 * Primera barrera: nadie sin una sesion firmada y vigente llega a una pagina ni
 * puede invocar una Server Action.
 *
 * Antes este middleware solo miraba que la cookie EXISTIERA, sin verificar la firma:
 * con mandar `alh_user=x` se podian leer todas las paginas e invocar cualquier
 * accion. Y dejaba abierto todo `/api`.
 *
 * Esto no reemplaza a `requireUser()` en las acciones: aca no hay acceso a la base,
 * asi que no se puede verificar `sessionVersion` ni si el usuario sigue activo.
 */

/** Rutas a las que se entra sin sesion. */
function isPublic(pathname: string): boolean {
  if (pathname === "/login") return true;
  // La API de la planta tiene su propia autenticacion (bearer token), no cookies.
  if (pathname.startsWith("/api/fleet/")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  let session = null;
  try {
    session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  } catch (err) {
    // Solo lanza por configuracion invalida (COOKIE_SECRET ausente o debil en
    // produccion). Falla cerrado: mejor un error que dejar pasar a todos.
    console.error("[middleware]", err instanceof Error ? err.message : err);
    return new NextResponse("Configuracion del servidor invalida.", { status: 500 });
  }

  if (session) {
    // El layout necesita saber que pagina se pidio (ver src/app/layout.tsx).
    const headers = new Headers(req.headers);
    headers.set(PATHNAME_HEADER, pathname);
    return NextResponse.next({ request: { headers } });
  }

  // Una Server Action es un POST con el header `Next-Action`. No se redirige:
  // se corta con 401, que es lo que corresponde para una llamada sin sesion.
  if (req.headers.has("next-action") || (req.method !== "GET" && req.method !== "HEAD")) {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const next = safeNext(pathname + search, "");
  if (next && next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  // Todo menos los archivos estaticos de Next y el favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
