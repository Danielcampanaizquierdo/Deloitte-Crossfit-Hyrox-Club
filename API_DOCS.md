# API Documentation

## Base URL
`http://localhost:8000/api`

## Authentication
Actualmente no hay autenticación para la API (fase 4). El passcode del admin es solo para UI.

## Response Format

Todas las respuestas son JSON.

### Success Response (2xx)
```json
{
  "id": "...",
  "name": "...",
  ...
}
```

### Error Response (4xx/5xx)
```json
{
  "error": "Descripción del error"
}
```

## Endpoints

### Events

#### GET /events
Obtener todos los eventos.

```bash
curl http://localhost:8000/api/events
```

**Response (200)**:
```json
[
  {
    "id": "evt-001",
    "title": "Entreno DEKA",
    "description": "...",
    "date": "2026-07-12T10:00:00",
    "location": "Madrid",
    "attendees": 8,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

#### GET /events/upcoming
Obtener próximos eventos (ordenados por fecha).

```bash
curl http://localhost:8000/api/events/upcoming
```

#### GET /events/{id}
Obtener evento específico.

```bash
curl http://localhost:8000/api/events/evt-001
```

#### POST /events
Crear nuevo evento.

```bash
curl -X POST http://localhost:8000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Event",
    "description": "Event description",
    "date": "2026-08-01T18:00:00",
    "location": "Madrid"
  }'
```

**Required fields**: title, description, date, location

**Response (201)**:
```json
{
  "id": "evt-1720000000000",
  "title": "New Event",
  ...
}
```

#### PUT /events/{id}
Actualizar evento.

```bash
curl -X PUT http://localhost:8000/api/events/evt-001 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'
```

#### DELETE /events/{id}
Eliminar evento.

```bash
curl -X DELETE http://localhost:8000/api/events/evt-001
```

---

### Members

#### GET /members
Obtener miembros aprobados. Soporta búsqueda y filtros.

```bash
# Obtener todos
curl http://localhost:8000/api/members

# Buscar por texto
curl "http://localhost:8000/api/members?search=demo"

# Filtrar por nivel
curl "http://localhost:8000/api/members?level=intermediate"

# Filtrar por objetivo
curl "http://localhost:8000/api/members?goal=crossfit"

# Combinar filtros
curl "http://localhost:8000/api/members?search=demo&level=intermediate&goal=hyrox"
```

#### GET /members/{id}
Obtener miembro específico.

```bash
curl http://localhost:8000/api/members/mbr-001
```

#### GET /members/pending
Obtener miembros pendientes de aprobar (admin).

```bash
curl http://localhost:8000/api/members/pending
```

#### POST /members
Retirado (**410**). Usar `POST /auth/register`, que exige contraseña.

#### PUT /members/{id}
Actualizar miembro.

```bash
curl -X PUT http://localhost:8000/api/members/mbr-001 \
  -H "Content-Type: application/json" \
  -d '{"location": "Valencia"}'
```

#### DELETE /members/{id}
Eliminar miembro.

```bash
curl -X DELETE http://localhost:8000/api/members/mbr-001
```

---

### PRs (Personal Records)

#### GET /prs
Obtener PRs aprobados. Filtrable por movimiento.

```bash
# Todos
curl http://localhost:8000/api/prs

# Por movimiento
curl "http://localhost:8000/api/prs?movement=clean_and_jerk"
```

**Valid movements**: clean_and_jerk, snatch, deadlift, squat, bench_press, back_squat, front_squat

#### GET /prs/{id}
Obtener PR específico.

```bash
curl http://localhost:8000/api/prs/pr-001
```

#### GET /prs/pending
Obtener PRs pendientes de aprobar (admin).

```bash
curl http://localhost:8000/api/prs/pending
```

#### POST /prs
Crear nuevo PR.

```bash
curl -X POST http://localhost:8000/api/prs \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": "mbr-001",
    "movement": "clean_and_jerk",
    "weight": 145,
    "date": "2026-07-15"
  }'
```

**Required fields**: memberId, movement, weight, date

**Response (201)**:
```json
{
  "id": "pr-1720000000000",
  "memberId": "mbr-001",
  "memberName": "Demo Athlete",
  "movement": "clean_and_jerk",
  "weight": 145,
  "approved": false,
  ...
}
```

#### DELETE /prs/{id}
Eliminar PR.

```bash
curl -X DELETE http://localhost:8000/api/prs/pr-001
```

---

### Results

#### GET /results
Obtener resultados aprobados.

```bash
curl http://localhost:8000/api/results
```

#### GET /results/{id}
Obtener resultado específico.

```bash
curl http://localhost:8000/api/results/res-001
```

#### GET /results/pending
Obtener resultados pendientes (admin).

```bash
curl http://localhost:8000/api/results/pending
```

#### POST /results
Crear nuevo resultado.

```bash
curl -X POST http://localhost:8000/api/results \
  -H "Content-Type: application/json" \
  -d '{
    "title": "HYROX Barcelona",
    "date": "2026-07-20",
    "description": "Amazing competition!",
    "results": [
      {"position": 1, "memberName": "Demo Athlete", "time": "58:45"},
      {"position": 2, "memberName": "Member B", "time": "59:30"}
    ]
  }'
```

**Required fields**: title, date, description, results

**Response (201)**:
```json
{
  "id": "res-1720000000000",
  "title": "HYROX Barcelona",
  "approved": false,
  ...
}
```

#### DELETE /results/{id}
Eliminar resultado.

```bash
curl -X DELETE http://localhost:8000/api/results/res-001
```

---

### Signups

#### GET /signups
Obtener todos los signups. Filtrable por evento.

```bash
# Todos
curl http://localhost:8000/api/signups

# Por evento
curl "http://localhost:8000/api/signups?eventId=evt-001"
```

#### GET /signups/{id}
Obtener signup específico.

```bash
curl http://localhost:8000/api/signups/signup-001
```

#### POST /signups
Crear nuevo signup (apuntarse a evento).

```bash
curl -X POST http://localhost:8000/api/signups \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "evt-001",
    "memberName": "John Doe",
    "memberEmail": "john@example.com",
    "notes": "Excited to attend!"
  }'
```

**Required fields**: eventId, memberName, memberEmail

**Response (201)**:
```json
{
  "id": "signup-1720000000000",
  "eventId": "evt-001",
  "memberName": "John Doe",
  ...
}
```

**Nota**: No se puede hacer una reserva duplicada para el mismo `memberId` y
evento, aunque el miembro cambie su email.

#### DELETE /signups/{id}
Cancelar signup.

```bash
curl -X DELETE http://localhost:8000/api/signups/signup-001
```

---

### Admin - Approvals

#### POST /admin/members/{id}/approve
Aprobar miembro pendiente.

```bash
curl -X POST http://localhost:8000/api/admin/members/mbr-003/approve
```

**Response (200)**:
```json
{
  "message": "Member approved",
  "member": {...}
}
```

#### POST /admin/prs/{id}/approve
Aprobar PR pendiente.

```bash
curl -X POST http://localhost:8000/api/admin/prs/pr-001/approve
```

#### POST /admin/results/{id}/approve
Aprobar resultado pendiente.

```bash
curl -X POST http://localhost:8000/api/admin/results/res-001/approve
```

---

### WODs

#### GET /wods
Tablón público: WODs aprobados (más recientes primero), cada uno con sus scores
aprobados ya ordenados según su `scoreType` (Rx antes que scaled; los tiempos de
menor a mayor, el resto de mayor a menor).

```bash
curl http://localhost:8000/api/wods
```

#### POST /wods *(admin)*
Publica un WOD. Se aprueba automáticamente, igual que eventos y resultados.

| Campo | Tipo | Obligatorio |
|---|---|---|
| `name` | string | sí |
| `date` | string (ISO o `YYYY-MM-DD`) | sí |
| `format` | `amrap`\|`for_time`\|`emom`\|`strength`\|`hyrox` | sí |
| `description` | string (se respetan los saltos de línea) | sí |
| `scoreType` | `reps`\|`rounds`\|`time`\|`weight` | sí |
| `timeCapMinutes` | number | no |

#### DELETE /wods/{id}/delete *(admin)*
Borra el WOD **y todos sus scores**, para no dejar scores huérfanos.

#### GET /wods/{id}/scores
Scores aprobados de ese WOD.

#### POST /wods/{id}/scores
Registra un score con la identidad de la sesión. Queda pendiente hasta que un
admin lo apruebe. Un mismo `memberId` solo puede registrar un score por WOD
(**409** si repite), aunque cambie su email.

Para un WOD con `scoreType: "time"`, `value` se envía como `mm:ss` (o `h:mm:ss`)
y se almacena en segundos. Para el resto, `value` es un número positivo.

```bash
curl -X POST http://localhost:8000/api/wods/wod-123/scores \
  -H "Content-Type: application/json" \
  -d '{"value":"12:40","scaled":false}'
```

#### POST /wod-scores/{id}/approve *(admin)*
#### DELETE /wod-scores/{id}/delete *(admin)*
Aprueba o descarta un score pendiente. Borrarlo libera al atleta para volver a
enviarlo corregido.

### Reservas

#### GET /events/{id}/attendees
Lista de asistentes en orden de reserva. Para usuarios no admin devuelve solo
`memberName` y `signedUpAt`: los ids internos, emails y comentarios se omiten. Un admin
recibe el registro completo.

#### POST /events/{id}/cancel
Cancela la reserva del `memberId` autenticado. Libera la plaza y decrementa el
contador de forma atómica.

```bash
curl -X POST http://localhost:8000/api/events/evt-123/cancel \
  -H "Content-Type: application/json"
```

**404** si la sesión actual no tiene una reserva en ese evento.

### Aforo de eventos

`POST /events` acepta `capacity` (opcional). Sin `capacity`, o con `capacity: 0`,
el evento es ilimitado — que es como se comporta todo evento creado antes de que
existiera este campo.

Cuando el evento está lleno, `POST /events/{id}/signup` responde **409** con
`{"error":"Este evento ya está completo"}`. La comprobación ocurre dentro de la
misma transacción atómica que incrementa el contador, así que dos atletas
compitiendo por la última plaza no pueden reservarla los dos.

### Métricas de PR

`POST /prs` deriva siempre `metric` del catálogo de movimientos
(`lib/movements.ts`); cualquier `metric` enviado por el cliente se ignora. Así
un movimiento no puede manipularse para alterar el ranking: los tiempos se
ordenan de menor a mayor y los pesos/repeticiones de mayor a menor.

Los PRs guardados antes de que existiera `metric` no lo llevan y se interpretan
como `weight`, que es lo que siempre fueron.

## Autenticación de miembros

Hasta ahora la identidad de un atleta era simplemente lo que escribía en el
formulario, así que cualquiera podía reservar, publicar un PR o registrar un
score en nombre de otro — y cancelar la reserva ajena sabiendo su email. Ahora
las cuentas tienen contraseña y las acciones van firmadas por la sesión.

#### POST /auth/register
Crea una cuenta. Requiere `password` (mínimo 8 caracteres), que se almacena como
hash PBKDF2-SHA256 con salt propio. La cuenta queda **pendiente de aprobación**;
no se emite sesión.

#### POST /auth/login
`{ email, password }`. Devuelve **401** con el mismo mensaje tanto si el email no
existe como si la contraseña es incorrecta, para no revelar qué direcciones
están registradas. Devuelve **403** si la cuenta aún no está aprobada. Con éxito
emite una cookie `member_session` (HttpOnly, SameSite=Lax, `Secure` en
producción). La sesión contiene tipo, id, emisión y caducidad firmados; un token
de miembro no puede reutilizarse como sesión admin.

#### POST /auth/logout
Cierra la sesión del miembro.

#### GET /auth/me
Devuelve `{ member }` con la sesión actual, o `{ member: null }`.

### Acciones que ahora exigen sesión

| Acción | Endpoint |
|---|---|
| Reservar plaza | `POST /events/{id}/signup` |
| Cancelar reserva | `POST /events/{id}/cancel` |
| Registrar PR | `POST /prs` |
| Registrar score de WOD | `POST /wods/{id}/scores` |

Todas responden **401** sin sesión. **La identidad se toma siempre de la sesión,
nunca del cuerpo de la petición**: enviar `memberName`/`memberEmail` no tiene
ningún efecto, la acción se atribuye a quien ha iniciado sesión. Cancelar ya no
acepta un email — libera la plaza de quien la pide.

### Endpoints retirados

- `POST /members` → **410**. Creaba cuentas sin credenciales. Usa
  `POST /auth/register`.
- `POST /signups` → **410**. Aceptaba nombre y email arbitrarios. Usa
  `POST /events/{id}/signup`.

### Permisos revisados

`PUT`/`DELETE /members/{id}` estaban abiertos a cualquiera: se podía editar el
perfil ajeno, auto-aprobarse o sobrescribir el hash de contraseña de otro. Ahora
requieren ser ese miembro o un admin, y sólo se aceptan campos concretos —
`approved` únicamente desde una sesión de admin. Lo mismo se corrigió en
`PUT`/`DELETE /events/{id}` (ahora admin), `DELETE /prs/{id}` (autor o admin),
`DELETE /results/{id}` (admin), `DELETE /signups/{id}` (titular o admin) y
`GET /signups` y `GET /members/pending` (admin).

Ninguna respuesta incluye `passwordHash` ni `passwordSalt`.

## Status Codes

- **200 OK** - Éxito
- **201 Created** - Recurso creado
- **400 Bad Request** - Datos inválidos
- **403 Forbidden** - Requiere sesión de admin
- **404 Not Found** - Recurso no existe
- **409 Conflict** - Duplicado o evento completo
- **500 Internal Server Error** - Error del servidor

## Error Examples

### Member not found
```json
{
  "error": "Member not found"
}
```

### Validation error
```json
{
  "error": "Invalid member data"
}
```

### Duplicate signup
```json
{
  "error": "Already signed up for this event"
}
```
