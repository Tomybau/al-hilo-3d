# Al Hilo 3D

Sistema interno de gestión para el negocio familiar de impresión 3D.

## Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + PostgreSQL
- Tailwind + componentes estilo shadcn/ui
- Server Actions, sin API REST
- Auth liviana: selector de usuario por cookie firmada (sin contraseña)

## Desarrollo local

Requisitos: Node 22, Docker (para Postgres).

```bash
# 1. Postgres en background
docker run -d --name alhilo-pg \
  -e POSTGRES_USER=alhilo -e POSTGRES_PASSWORD=alhilo -e POSTGRES_DB=alhilo3d \
  -p 5432:5432 postgres:16-alpine

# 2. Instalar deps + migrar + sembrar
cp .env.example .env
npm install
npm run db:migrate -- --name init
npm run db:seed

# 3. Dev server
npm run dev
# http://localhost:3000
```

## Despliegue en VPS

```bash
# En el VPS, dentro del directorio del proyecto:
cp .env.example .env
# Editá .env y poné COOKIE_SECRET y POSTGRES_PASSWORD reales
openssl rand -base64 32   # generar COOKIE_SECRET

docker compose up -d --build
# La app queda en 127.0.0.1:3000 — ponele un reverse proxy (Caddy/nginx) por encima.
```

Updates posteriores:
```bash
git pull
docker compose up -d --build
```

Migraciones se aplican solas en cada arranque (`prisma migrate deploy` en el CMD del contenedor).

## Backups

Cron sugerido en el host:
```bash
0 3 * * * docker exec alhilo3d-postgres-1 pg_dump -U alhilo alhilo3d | gzip > /backups/alhilo3d-$(date +\%F).sql.gz
```

## Módulos

- **/** Dashboard con totales rápidos.
- **/ventas** Días de venta + carga rápida + cierre con conciliación.
- **/juguetes** Catálogo, precios (con historial), actualización masiva por %.
- **/filamentos** Inventario por marca/color/tipo, batches, movimientos.
- **/finanzas** Cuentas, ingresos, gastos, filtros, saldo por cuenta.
- **/impresoras** Impresoras + repuestos + historial de problemas.
- **/configuracion** Usuarios.
- **/quien-soy** Selector de usuario.

## Modelo de datos

Ver [prisma/schema.prisma](prisma/schema.prisma).

Decisiones clave:
- `SaleLine.unitPriceArs` snapshot del precio al momento de venta (no se rompe al actualizar precios).
- Cierre de día genera `Transaction` automáticas por cada cuenta cobrada y un `Settlement` por descuento o discrepancia.
- Cada escritura registra `createdById` (cookie del usuario actual).
