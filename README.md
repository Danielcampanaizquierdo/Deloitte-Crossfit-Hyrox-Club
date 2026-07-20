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
├── components/
│   ├── Topbar.tsx         # Barra superior con branding
│   ├── Hero.tsx           # Sección hero
│   ├── Navigation.tsx      # Navegación de tabs
│   ├── EventsSection.tsx   # Sección de eventos
│   ├── LeaderboardSection.tsx  # Leaderboard de PRs
│   ├── ResultsSection.tsx  # Resultados de competiciones
│   ├── MembersSection.tsx  # Perfiles de miembros
│   ├── AdminSection.tsx    # Panel de administración
│   └── Footer.tsx         # Pie de página
├── fresh.gen.ts           # Archivo generado automáticamente
├── fresh.config.ts        # Configuración de Fresh
├── main.ts                # Punto de entrada del servidor
├── dev.ts                 # Servidor de desarrollo
├── deno.json              # Configuración de Deno
└── README.md              # Este archivo
```

## ✨ Características Actuales

✅ **HTML Skeleton**: Estructura completa del UI en componentes Preact/TSX
✅ **Estilos preservados**: Todo el CSS original mantenido
✅ **Componentes modulares**: Cada sección como componente reutilizable
✅ **Diseño responsivo**: Layouts mobile-first
✅ **Tema oscuro**: Diseño Deloitte brand

## 🔜 Próximas fases

### Fase 2: Lógica Interactiva (Frontend)
- [ ] Navegación de tabs con state
- [ ] Modal management (signup, create event, etc.)
- [ ] Calendar rendering dinámico
- [ ] Countdown timer para eventos
- [ ] Filtros de miembros
- [ ] Admin authentication

### Fase 3: Backend
- [ ] API routes en Deno
- [ ] Base de datos (MongoDB o PostgreSQL)
- [ ] Autenticación y autorización
- [ ] CRUD para eventos, miembros, PRs, resultados
- [ ] Upload de imágenes
- [ ] Admin panel

## 🛠️ Tecnologías

- **Deno**: Runtime de JavaScript/TypeScript
- **Fresh**: Framework web moderno (Preact + Islands)
- **Preact**: Librería UI ligera
- **TypeScript**: Type safety

## 📝 Notas

- Este branch (`deno-fresh-migration`) es independiente del HTML original
- El HTML original se mantiene en la rama `main`
- Los estilos CSS se han integrado en los componentes por ahora
- En fase posterior se moverán a archivos CSS separados si es necesario

## 👨‍💻 Desarrollo

```bash
# Ver cambios en tiempo real
deno run -A --watch=components/,routes/ dev.ts

# Build para producción
deno run -A dev.ts build

# Preview de producción
deno run -A main.ts
```

---

**Status**: 🟡 En progreso - Esqueleto HTML completado
