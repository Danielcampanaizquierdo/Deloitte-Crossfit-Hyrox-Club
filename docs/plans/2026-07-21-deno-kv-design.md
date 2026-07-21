# Diseño: persistencia con Deno KV

**Fecha:** 2026-07-21  
**Estado:** aprobado

## Objetivo

Sustituir el almacenamiento JSON local por Deno KV en la aplicación Fresh ya
desplegada en Deno Deploy, sin modificar los contratos HTTP existentes ni
migrar los datos de `data/*.json`. La base comienza vacía.

## Contexto de ejecución

`lib/kv.ts` abrirá una única instancia mediante `Deno.openKv()`.

- En Deno Deploy, la aplicación se conectará sin configuración adicional a la
  base Deno KV asignada a la aplicación y a su timeline.
- En desarrollo local se usará el backend local de Deno KV.
- Las pruebas abrirán una instancia aislada con `Deno.openKv(":memory:")`.

Antes de desplegar, se debe crear y asignar una base Deno KV a la aplicación en
la consola de Deno Deploy. No habrá URL, ID ni token de base de datos en el
código de producción.

## Arquitectura

Se incorporará una capa de repositorios entre los servicios de negocio y Deno
KV. Los servicios conservarán su API pública y los endpoints no cambiarán.

Cada registro se almacenará individualmente y con su propio identificador. Los
repositorios encapsularán las claves, las conversiones y las transacciones; los
servicios conservarán las validaciones y las reglas de negocio.

## Modelo de claves

| Entidad | Registro | Índices |
| --- | --- | --- |
| Eventos | `["events", id]` | `["events_by_approval", approved, id]`, `["events_by_date", timestamp, id]` |
| Miembros | `["members", id]` | `["members_by_approval", approved, id]`, `["members_by_email", normalizedEmail]` |
| PRs | `["prs", id]` | `["prs_by_approval", approved, id]`, `["prs_by_movement", movement, id]`, `["prs_by_member", memberId, id]` |
| Resultados | `["results", id]` | `["results_by_approval", approved, id]` |
| Inscripciones | `["signups", id]` | `["signups_by_event", eventId, id]`, `["signups_by_member", memberId, id]`, `["signups_by_event_email", eventId, normalizedEmail]` |

Los índices contendrán el identificador del registro. Los repositorios
resolverán esos identificadores contra sus claves principales y omitirán
entradas huérfanas de forma defensiva.

## Escrituras y concurrencia

Las altas, actualizaciones y bajas usarán `Deno.Kv.atomic()` junto con
comprobaciones de `versionstamp` para modificar el registro y sus índices como
una sola operación. Si hay conflicto, el repositorio releerá el estado y hará
un reintento acotado antes de devolver un error.

La creación de una inscripción comprobará y escribirá atómicamente la clave
`["signups_by_event_email", eventId, normalizedEmail]`, la inscripción, sus
índices y el nuevo contador del evento. La cancelación realizará la operación
inversa. Así se evita tanto la inscripción duplicada como un contador
`attendees` inconsistente cuando hay solicitudes simultáneas.

Las fechas se almacenarán como objetos `Date`, que Deno KV puede serializar, de
modo que no cambian los tipos ni las respuestas actuales.

## Errores y compatibilidad

- Las rutas seguirán convirtiendo `null` y `false` de los servicios en las
  respuestas HTTP existentes.
- Los conflictos de correo e inscripción producirán los mismos errores de
  dominio que hoy consumen las rutas.
- No se leerán, copiarán ni eliminarán los archivos JSON existentes.
- La conexión KV se mantendrá abierta durante la vida del proceso; no se
  cerrará por petición.

## Pruebas

Se crearán pruebas con KV efímero que cubran CRUD, consultas por índice,
aprobaciones, unicidad de correo, unicidad de inscripción, actualización del
contador de asistentes y conflictos de concurrencia. La implementación se
validará además con `deno test` y `deno check` sobre la aplicación.

## Operación y privacidad

Antes del despliegue se debe asignar una base Deno KV a la aplicación desde la
consola de Deno Deploy. Deno informa de que Deno KV almacena y transmite los
datos en Estados Unidos; por tanto, el responsable del club debe validar la
base legal y las garantías de privacidad aplicables antes de almacenar datos
personales reales, como nombres y correos.
