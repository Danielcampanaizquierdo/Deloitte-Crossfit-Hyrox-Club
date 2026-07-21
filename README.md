# Deloitte CrossFit HYROX Club - Deno Fresh Migration

Deployment setup: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

Conversión de la página web estática HTML a una aplicación web moderna usando
Deno Fresh con backend API completo.

## 🚀 Quick Start

### Requisitos

- [Deno](https://deno.land/) 1.40+

### Instalación y desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/Danielcampanaizquierdo/Deloitte-Crossfit-Hyrox-Club.git
cd Deloitte-Crossfit-Hyrox-Club
git checkout deno-fresh-migration

# Ejecutar en modo desarrollo
deno task dev
```

La aplicación estará disponible en `http://localhost:8000`

> **Persistencia (Deno KV):** la app usa Deno KV, una API "unstable" de Deno.
> Está habilitada de forma automática mediante `"unstable": ["kv"]` en
> `deno.json`, por lo que cualquier comando de Deno que use este proyecto
> (`deno task dev`, `deno test`, `deno run ... main.ts`) tiene acceso a KV sin
> necesidad de pasar `--unstable-kv` a mano. Si ejecutas la app con un comando
> propio que ignore `deno.json`, añade `--unstable-kv` o la interacción con la
> base de datos fallará con `Deno.openKv is not a function`.

> **Login de administrador:** el inicio de sesión requiere las variables de
> entorno `ADMIN_PASSCODE` y `SESSION_SECRET` (esta última, un secreto aleatorio
> de al menos 32 caracteres). Sin ellas, `POST /api/admin/login` responde 500.
> Consulta [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para el despliegue.

## 📁 Estructura del Proyecto

```
.
├── routes/
│   ├── _app.tsx                    # Layout principal
│   ├── index.tsx                   # Página home
│   └── api/                        # API routes
│       ├── events/
│       │   ├── index.ts            # GET/POST eventos
│       │   ├── [id].ts             # GET/PUT/DELETE evento
│       │   ├── upcoming.ts         # GET próximos eventos
│       │   └── ...
│       ├── members/
│       ├── prs/
│       ├── results/
│       ├── signups/
│       └── admin/
├── islands/                        # Componentes interactivos
│   ├── Hero.tsx                    # Portada + cuenta atrás
│   ├── TabNavigation.tsx           # Pestañas con rutas por hash
│   ├── EventsSection.tsx           # Tarjetas, calendario y reservas
│   ├── WodSection.tsx              # Tablón de WODs y scores
│   ├── LeaderboardSection.tsx      # PRs y registro de marcas
│   ├── MembersSection.tsx          # Comunidad y perfiles
│   └── AdminSection.tsx            # Login y moderación
├── components/                     # Componentes sin estado
│   ├── Modal.tsx                   # Diálogo accesible reutilizable
│   ├── Countdown.tsx               # Cuenta atrás reutilizable
│   ├── Topbar.tsx
│   └── Footer.tsx
├── lib/
│   ├── movements.ts                # Catálogo y métricas de PR
│   ├── toast.ts                    # Notificaciones
│   ├── bus.ts                      # Eventos entre islands
│   ├── errors.ts
│   ├── kv.ts
│   └── session.ts
├── scripts/
│   └── seed.ts                     # Datos de ejemplo (solo localhost)
├── services/                       # Lógica de negocio
│   ├── eventService.ts
│   ├── memberService.ts
│   ├── prService.ts
│   ├── resultService.ts
│   └── signupService.ts
├── types/                          # Type definitions
│   ├── Event.ts
│   ├── Member.ts
│   ├── PR.ts
│   ├── Result.ts
│   └── Signup.ts
├── lib/
│   └── api.ts                      # Cliente HTTP
├── fresh.gen.ts                    # Auto-generated
├── fresh.config.ts                 # Configuración
├── main.ts                         # Servidor prod
├── dev.ts                          # Servidor dev
├── deno.json                       # Config Deno
└── README.md
```

## ✨ Características - Fase 2 ✅ COMPLETADA

### Backend API

#### Events API

- `GET /api/events` - Obtener todos los eventos
- `GET /api/events/upcoming` - Próximos eventos
- `GET /api/events/[id]` - Detalle del evento
- `POST /api/events` - Crear evento
- `PUT /api/events/[id]` - Actualizar evento
- `DELETE /api/events/[id]` - Eliminar evento

#### Members API

- `GET /api/members` - Miembros aprobados (con búsqueda/filtros)
- `GET /api/members/[id]` - Detalle del miembro
- `GET /api/members/pending` - Miembros pendientes (admin)
- `POST /api/members` - Crear miembro
- `PUT /api/members/[id]` - Actualizar miembro
- `DELETE /api/members/[id]` - Eliminar miembro

#### PRs API

- `GET /api/prs` - PRs aprobados (con filtros por movimiento)
- `GET /api/prs/[id]` - Detalle del PR
- `GET /api/prs/pending` - PRs pendientes (admin)
- `POST /api/prs` - Crear PR
- `DELETE /api/prs/[id]` - Eliminar PR

#### Results API

- `GET /api/results` - Resultados aprobados
- `GET /api/results/[id]` - Detalle del resultado
- `GET /api/results/pending` - Resultados pendientes (admin)
- `POST /api/results` - Crear resultado
- `DELETE /api/results/[id]` - Eliminar resultado

#### Signups API

- `GET /api/signups` - Todos los signups (con filtro por evento)
- `GET /api/signups/[id]` - Detalle del signup
- `POST /api/signups` - Crear signup (apuntarse)
- `DELETE /api/signups/[id]` - Cancelar signup

#### Admin API

- `POST /api/admin/members/[id]/approve` - Aprobar miembro
- `POST /api/admin/prs/[id]/approve` - Aprobar PR
- `POST /api/admin/results/[id]/approve` - Aprobar resultado

### Services (Lógica de negocio)

- **eventService** - CRUD de eventos + getUpcoming
- **memberService** - CRUD de miembros + search + approve/reject
- **prService** - CRUD de PRs + getByMovement + approve
- **resultService** - CRUD de resultados + approve
- **signupService** - CRUD de signups + checkDuplicates

### Frontend Integration

✅ **Formularios funcionales**

- EventFormModal - Crear eventos con API
- MemberFormModal - Crear miembros con API
- SignupFormModal - Apuntarse a eventos
- PRFormModal - Añadir PRs
- ResultFormModal - Registrar resultados

✅ **Admin Panel**

- Aprobar/rechazar miembros pendientes
- Aprobar/rechazar PRs
- Aprobar/rechazar resultados
- Sistema de autenticación con passcode

✅ **Cliente HTTP**

- `api.get()` - Peticiones GET
- `api.post()` - Peticiones POST
- `api.put()` - Peticiones PUT
- `api.delete()` - Peticiones DELETE
- Manejo automático de errores

## 📊 Data Models

### Event

```typescript
{
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  attendees: number;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Member

```typescript
{
  id: string;
  name: string;
  email: string;
  level: "beginner" | "intermediate" | "advanced";
  goal: "crossfit" | "hyrox" | "general";
  location: string;
  avatar?: string;
  bio?: string;
  joinedAt: Date;
  approved: boolean; // Admin approval
  createdAt: Date;
  updatedAt: Date;
}
```

### PR (Personal Record)

```typescript
{
  id: string;
  memberId: string;
  memberName: string;
  movement: "clean_and_jerk" | "snatch" | "deadlift" | ...;
  weight: number; // en kg
  date: Date;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### CompetitionResult

```typescript
{
  id: string;
  title: string;
  date: Date;
  description: string;
  image?: string;
  results: {
    position: number;
    memberName: string;
    score?: string;
    time?: string;
  }[];
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### EventSignup

```typescript
{
  id: string;
  eventId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  notes?: string;
  signedUpAt: Date;
}
```

## 🔄 Workflow

### Crear Evento

1. User rellena formulario en modal
2. `EventFormModal` hace POST a `/api/events`
3. `eventService.create()` procesa los datos
4. Evento se guarda en BD
5. Página se recarga con el nuevo evento

### Apuntarse a Evento

1. User rellena formulario de signup
2. `SignupFormModal` hace POST a `/api/signups`
3. `signupService.create()` valida no duplicados
4. Se incrementa contador de attendees del evento
5. Confirmación visual

### Admin Approving

1. Admin ve items pendientes en sección Admin
2. Click en "Approve" → POST `/api/admin/{type}/{id}/approve`
3. Service marca item como `approved: true`
4. Item aparece en listado público

## 🧪 Testing la API

```bash
# Get all events
curl http://localhost:8000/api/events

# Get upcoming events
curl http://localhost:8000/api/events/upcoming

# Get approved members
curl http://localhost:8000/api/members

# Search members
curl "http://localhost:8000/api/members?search=demo&level=intermediate"

# Get PRs by movement
curl "http://localhost:8000/api/prs?movement=clean_and_jerk"

# Create event
curl -X POST http://localhost:8000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Event",
    "description": "Description",
    "date": "2026-08-01T18:00:00",
    "location": "Madrid"
  }'

# Create member
curl -X POST http://localhost:8000/api/members \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "level": "beginner",
    "goal": "hyrox",
    "location": "Madrid"
  }'

# Create signup
curl -X POST http://localhost:8000/api/signups \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "evt-001",
    "memberName": "Demo",
    "memberEmail": "demo@example.com"
  }'
```

## 🔐 Admin Features

- **Passcode**: `ClubAdmin2026`
- **Pending Approvals**:
  - Members pendientes de aprobar
  - PRs pendientes
  - Results pendientes
  - Events pendientes
- **Moderation Tools**:
  - Approve/Reject members
  - Approve/Reject PRs
  - Approve/Reject results
  - View all submissions

## 🛠️ Tecnologías

- **Deno** - Secure runtime
- **Fresh** - SSR + Islands
- **Preact** - Lightweight UI library
- **TypeScript** - Type safety
- **Deno KV** - Persistencia (Fase 3, completada)

## 🏋️ Fase 4: Club completo (completada)

### Reservas de actividades

- Aforo por evento (`capacity`). Sin aforo el evento es ilimitado, que es como
  se comporta todo evento creado antes de que existiera el campo.
- La comprobación de aforo ocurre **dentro** de la transacción atómica que
  incrementa el contador, así que dos atletas peleando por la última plaza no
  pueden reservarla los dos.
- Barra de plazas restantes y estado "Completo" en cada tarjeta.
- Lista de asistentes por evento. Sin sesión de admin se devuelven solo los
  nombres: los emails y comentarios no se exponen.
- Cancelación propia con el email usado al reservar, que libera la plaza.

### Calendario

- Rejilla que empieza en lunes, coherente con las cabeceras `L M X J V S D`.
  Antes se calculaba con `getDay()` (domingo = 0), así que **cada evento se
  pintaba un día corrido**.
- Día de hoy resaltado, navegación por mes y botón "Hoy".
- Al seleccionar un día se listan sus sesiones y se puede reservar desde ahí,
  con el evento ya seleccionado en el formulario.

### PRs multimétrica

- Un PR puede ser peso (kg), tiempo (`mm:ss`) o repeticiones. La métrica se
  deduce del catálogo de `lib/movements.ts`, no se confía en el cliente.
- Los tiempos se ordenan de menor a mayor y los pesos y repeticiones de mayor a
  menor, así que una marca de 5K ya no compite "al revés" contra un deadlift.
- Leaderboard por categoría (halterofilia, gimnásticos, benchmark, cardio) con
  búsqueda por atleta y una sola marca —la mejor— por atleta y movimiento.

### WOD del día

- Tablón con el workout tal cual se escribe, formato (AMRAP, For Time, EMOM…) y
  time cap.
- Cada atleta registra su score una vez por WOD; queda pendiente hasta que un
  admin lo aprueba.
- Ranking por WOD según su `scoreType`, con Rx siempre por delante de scaled.

### Perfiles y moderación

- Ficha de miembro con bio y sus récords, formateados según su métrica.
- Panel de moderación unificado (eventos, PRs, scores de WOD, resultados y
  miembros) con contador en vivo en la pestaña Admin.

### Interfaz

- Notificaciones toast en lugar de mensajes incrustados en cada formulario.
- Modales accesibles: cierre con `Esc` y clic en el fondo, foco atrapado
  mientras están abiertos, foco devuelto al cerrar y bloqueo del scroll de
  fondo. Antes se ocultaban con `style.display`, así que sus campos seguían en
  el orden de tabulación estando "cerrados".
- Pestañas enlazables por hash (`/#wod`), compatibles con el botón atrás.
- La cuenta atrás del hero usa el próximo evento real. Antes leía un atributo
  `data-countdown` que nadie consultaba, así que el recuadro salía vacío.

### Datos de ejemplo

```bash
deno run -A scripts/seed.ts
```

Crea eventos, miembros, PRs de las tres métricas, WODs con scores y resultados.
Se niega a ejecutarse contra cualquier host que no sea localhost salvo que se
pase `SEED_ALLOW_REMOTE=1`.

## 📈 Fases anteriores

### Fase 3: Persistencia con Deno KV (completada)

- [x] Persistencia mediante Deno KV, sustituyendo el almacenamiento in-memory
- [x] Repositorios por entidad con escrituras atómicas (`Deno.Kv.atomic()`)
- [x] Antes de desplegar: crear y asignar una base Deno KV a la app desde la
      consola de Deno Deploy (ver [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md))

> **Nota sobre residencia de datos**: según la documentación de Deno, Deno KV
> almacena y transmite los datos en Estados Unidos. Este proyecto no reclama
> residencia exclusiva en la UE ni cumplimiento de GDPR. Quien opere este
> despliegue con datos personales reales (nombres, correos electrónicos) debe
> verificar de forma independiente la base legal y las garantías de privacidad
> que le apliquen.

### Pendiente

- [ ] Cuentas de usuario propias (hoy la identidad de un atleta es su email)
- [ ] Subida de imágenes para eventos, resultados y avatares
- [ ] Notificaciones por email al aprobar o al liberarse una plaza
- [ ] Lista de espera cuando un evento se llena
- [ ] Exportar resultados y rankings

## 📝 Datos de Prueba

### Admin

- **Passcode**: ClubAdmin2026

### Miembros de prueba

- Demo Athlete (Intermediate, CrossFit/HYROX) - APPROVED
- Member B (Advanced, Strength) - APPROVED
- Member C (Beginner, HYROX) - PENDING

### Eventos de prueba

- Entreno DEKA - 12 Jul 2026 10:00
- HYROX Team Session - 19 Jul 2026 09:30

## 🐛 Debugging

```bash
# Ver logs del servidor
# Los logs aparecen en la terminal donde ejecutaste `deno run -A dev.ts`

# Habilitar verbose logging
DENO_LOG=debug deno run -A dev.ts
```

## 📚 Documentación de APIs

Ver [API_DOCS.md](./API_DOCS.md) para documentación detallada de endpoints.

## 🤝 Contribuir

1. Create a branch: `git checkout -b feature/nombre`
2. Commit changes: `git commit -m 'Add feature'`
3. Push: `git push origin feature/nombre`
4. Open PR

---

**Status**: 🟢 Fase 4 completada | Reservas con aforo, calendario, PRs
multimétrica, WODs y moderación, sobre persistencia Deno KV

**Última actualización**: 21 Jul 2026
