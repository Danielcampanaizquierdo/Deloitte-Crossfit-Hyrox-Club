# Diseño: panel único de administración

**Fecha:** 2026-07-21  
**Estado:** aprobado

## Objetivo

Incorporar un único panel protegido que permita administrar usuarios, eventos
del calendario, solicitudes y cuentas administradoras. Sustituye el passcode
compartido por cuentas individuales de administrador.

## Arquitectura

La persistencia usa Deno KV. Las cuentas administrativas se guardan por
identificador y se indexan por correo normalizado. El primer administrador se
aprovisiona mediante variables de entorno de Deno Deploy; el panel permite que
un administrador autorizado gestione las demás cuentas sin exponer sus hashes
de contraseña.

Las sesiones siguen siendo cookies HTTP-only firmadas, pero incluyen el
identificador y rol del administrador autenticado. Todas las rutas de gestión
comprueban la sesión y el rol antes de leer o modificar datos.

## Panel

- **Usuarios:** buscar, editar, aprobar, rechazar, activar/desactivar y
  eliminar perfiles.
- **Calendario:** crear, editar, publicar/despublicar, cancelar y eliminar
  eventos.
- **Solicitudes:** aprobar o rechazar miembros, PRs y resultados pendientes.
- **Administradores:** crear y desactivar cuentas de administrador; nunca se
  devuelve una contraseña ni su hash.

La interfaz muestra errores de la API y solicita confirmación antes de las
eliminaciones. La API mantiene respuestas 401/403 para sesiones inválidas o
roles insuficientes, 404 para recursos inexistentes y 409 para correos
duplicados.

## Datos y seguridad

- `admins/[id]`: correo, nombre, hash de contraseña, activo, fechas.
- `admins_by_email/[email]`: índice único.
- Las contraseñas se derivan con un algoritmo de hash de contraseña resistente
  a fuerza bruta; no se almacena texto plano.
- Variables requeridas: correo, nombre y contraseña del administrador inicial;
  la inicialización es idempotente.
- Los cambios de usuarios, eventos y administradores se validan en servidor.

## Verificación

Pruebas aisladas de KV cubrirán el índice único, autenticación, autorización,
CRUD de usuarios y eventos, publicación/cancelación, y el manejo de errores.
Se verificará el panel mediante build Fresh y pruebas de rutas autenticadas.
