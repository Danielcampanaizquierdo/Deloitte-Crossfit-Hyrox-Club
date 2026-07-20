# Deloitte CrossFit HYROX Club - Deno Fresh Migration

Conversión de la página web estática HTML a una aplicación web moderna usando Deno Fresh.

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
│   ├── _app.tsx           # Layout principal
│   └── index.tsx          # Página home (principal)
├── islands/               # Componentes interactivos
│   ├── TabNavigation.tsx      # Navegación entre tabs
│   ├── EventViewToggle.tsx    # Toggle cards/calendar
│   ├── ModalManager.tsx       # Gestor de modales
│   ├── CountdownTimer.tsx     # Timer para eventos
│   ├── AdminPanel.tsx         # Panel de admin con auth
│   ├── MembersFilter.tsx      # Filtros de miembros
│   ├── Calendar.tsx           # Calendario interactivo
│   └── ModalContainer.tsx     # Contenedor de modales
├── components/                # Componentes estáticos
│   ├── Topbar.tsx
│   ├── Hero.tsx
│   ├── Navigation.tsx
│   ├── Footer.tsx
│   └── ...
├── fresh.gen.ts           # Archivo generado autom.
├── fresh.config.ts        # Configuración de Fresh
├── main.ts                # Punto de entrada servidor
├── dev.ts                 # Servidor desarrollo
├── deno.json              # Configuración Deno
└── README.md              # Este archivo
```

## ✨ Características - Fase 1 ✅ COMPLETADA

### Componentes Interactivos
✅ **Navegación de Tabs** - Switch entre secciones (Eventos, Leaderboard, Resultados, Members, Admin)
✅ **Event View Toggle** - Cambiar entre vista Cards y Calendar
✅ **Countdown Timers** - Contadores en vivo para cada evento
✅ **Calendario Dinámico** - Navegación mes a mes con eventos
✅ **Admin Panel** - Sistema de autenticación con passcode
✅ **Members Filter** - Filtrado por nombre, nivel y goal
✅ **Modal Management** - Abrir/cerrar modales dinámicamente
✅ **Estilos preservados** - Todo el CSS original funcionando

### Funcionalidades
- ✅ Tabs con estado reactivo
- ✅ Modales para signup, crear evento, añadir PR, etc.
- ✅ Contadores regresivos actualizados en tiempo real
- ✅ Calendario con navegación
- ✅ Filtros de miembros en vivo
- ✅ Admin auth con passcode (ClubAdmin2026)

## 🎯 Próximas Fases

### Fase 2: Backend (Próximamente)
- [ ] API routes en Deno
- [ ] Base de datos (MongoDB o PostgreSQL)
- [ ] Autenticación real de usuarios
- [ ] CRUD completo para:
  - Eventos
  - Miembros
  - PRs
  - Resultados
- [ ] Sistema de validación de datos
- [ ] Upload de imágenes
- [ ] Admin panel con CRUD

### Fase 3: Integración Final
- [ ] Conectar frontend con API
- [ ] Manejo de errores
- [ ] Estados de carga
- [ ] Notificaciones
- [ ] Persistencia de datos

## 🛠️ Tecnologías

- **Deno** - Runtime seguro de JavaScript/TypeScript
- **Fresh** - Framework web moderno (Preact + Islands Architecture)
- **Preact** - Librería UI ligera (3KB)
- **TypeScript** - Type safety y autocompletado
- **hooks** - Manejo de estado local (useState, useEffect)

## 📝 Islands Architecture

Este proyecto usa el patrón "Islands" de Fresh:
- **Components** (`/components`) - HTML estático, sin interactividad
- **Islands** (`/islands`) - Componentes Preact interactivos, enviados a cliente
- **Routes** (`/routes`) - Páginas SSR

Beneficios:
- JavaScript minimal en cliente
- Mejor performance
- SEO friendly
- Carga progresiva

## 🚀 Comandos

```bash
# Desarrollo con hot reload
deno run -A dev.ts

# Build para producción
deno run -A dev.ts build

# Preview de producción
deno run -A main.ts

# Watch con archivos específicos
deno run -A --watch=components/,islands/,routes/ dev.ts
```

## 📖 Documentación

- [Fresh Docs](https://fresh.deno.dev/)
- [Preact Docs](https://preactjs.com/)
- [Deno Manual](https://deno.land/manual)

## 🤝 Notas de Desarrollo

### Admin Passcode
- **Usuario**: cualquiera
- **Passcode**: `ClubAdmin2026`

### Eventos de prueba
- Entreno DEKA: 12 Jul 2026 10:00
- HYROX Team Session: 19 Jul 2026 09:30

### Miembros de prueba
- Demo Athlete (Intermediate, CrossFit/HYROX)
- Member B (Advanced, Strength training)
- Member C (Beginner, HYROX prep)

---

**Status**: 🟢 Fase 1 Completada | Fase 2 En Progreso

**Última actualización**: 20 Jul 2026
