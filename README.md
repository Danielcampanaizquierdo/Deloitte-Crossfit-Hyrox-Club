# Deloitte CrossFit HYROX Club - Deno Fresh Migration

Conversión de la página web estática HTML a una aplicación web moderna usando Deno Fresh con backend API completo.

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
deno run -A dev.ts
```

La aplicación estará disponible en `http://localhost:8000`

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
│   ├── TabNavigation.tsx           # Navegación
│   ├── EventViewToggle.tsx         # Toggle vista
│   ├── CountdownTimer.tsx          # Timer
│   ├── Calendar.tsx                # Calendario
│   ├── AdminPanel.tsx              # Admin auth
│   ├── MembersFilter.tsx           # Filtros
│   ├── EventFormModal.tsx          # Crear evento
│   ├── MemberFormModal.tsx         # Crear miembro
│   ├── SignupFormModal.tsx         # Apuntarse
│   ├── PRFormModal.tsx             # Añadir PR
│   ├── ResultFormModal.tsx         # Añadir resultado
│   └── PendingApprovalManager.tsx  # Aprobar items
├── components/                     # Componentes estáticos
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
- **In-memory storage** - Fase 2 (será reemplazado con DB)

## 📈 Próximas Fases

### Fase 3: Database Integration
- [ ] PostgreSQL o MongoDB
- [ ] Connection pooling
- [ ] Migrations
- [ ] Reemplazar in-memory con queries reales

### Fase 4: Authentication
- [ ] User login/register
- [ ] JWT tokens
- [ ] Role-based access (user, admin)
- [ ] Session management

### Fase 5: File Upload
- [ ] Image upload para eventos
- [ ] Image upload para results
- [ ] Avatar upload para miembros
- [ ] AWS S3 o similar

### Fase 6: Advanced Features
- [ ] Email notifications
- [ ] Leaderboard rankings
- [ ] Statistics dashboard
- [ ] Export reports
- [ ] Dark/Light mode toggle

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

**Status**: 🟢 Fase 2 Completada | Backend API Funcional

**Última actualización**: 20 Jul 2026

**Próximo**: Fase 3 - Database Integration
