# Kanban para OpenChamber

Español · [English](README.md)

Un tablero Kanban dentro de OpenChamber, conectado a [Planka](https://planka.app) o a
un tablero guardado en este equipo. Mueve tarjetas, abre una sesión del agente en la
tarjeta que estés trabajando, y deja que el agente lea y mueva tarjetas con sus
herramientas.

![El panel del tablero](docs/panel.png)

## Qué es

- Un **panel** con tres columnas: IDEAS, EN PROGRESO y HECHO.
- Una sección compacta de **Work Status** en la barra lateral con la tarjeta en curso.
- **Sesiones**: enlaza una sesión de OpenChamber a una tarjeta y ábrela desde ahí.
- Un **agente** que puede crear, mover, completar, editar y buscar tarjetas.

No es un gestor de proyectos: no hay sprints, ni estimaciones, ni informes. Un
tablero, tres columnas, tarjetas.

## Requisitos

- OpenChamber 2.7.0 o superior.
- **O** una instancia de Planka a la que puedas llegar con una cuenta, **o** nada más:
  el tablero local no necesita servidor.
- Node.js 20+ solo si vas a compilar el paquete tú mismo.

## Instalación

1. Abre **Ajustes → Extensiones** en OpenChamber.
2. Añade la carpeta que contiene este paquete.
3. El icono de Kanban aparece en la barra lateral. Ábrelo.

El paquete declara su panel, su sección de Work Status, su servicio y las herramientas
del agente en `package.json`, así que no hay nada más que conectar.

## Conectar con Planka

La primera vez el panel pide tres cosas:

| Campo | Qué es |
| --- | --- |
| Servidor | La dirección de tu Planka, por ejemplo `http://127.0.0.1:3040` |
| Correo o usuario | Tu cuenta de Planka |
| Contraseña | Se usa una vez para obtener un token; nunca se guarda en disco |

El token se guarda en `config.json` junto a la extensión, legible solo por ti. Una vez
conectado, el panel muestra tus tableros: elige uno y asígnalo a un proyecto de
OpenChamber. Las sesiones de ese tablero se crean en ese proyecto.

## Tablero local

Si no tienes Planka, abre **Ajustes → Conexión** y elige **Local**. Aparece un tablero
con las tres listas y tres etiquetas, guardado en `board.local.json` junto a la
extensión.

- Vive en este equipo: sin móvil, sin segundo ordenador.
- Volver a Planka conserva tu token, así que no tendrás que entrar otra vez.
- No se copia nada entre los dos: son tableros distintos.
- **Copia**: Ajustes → Conexión ofrece Copiar tablero y Restaurar. Guarda el texto en
  un sitio seguro; pégalo para recuperar el tablero.

![Conexión y apariencia](docs/settings.png)

## El panel

- **Crear**: el `+` del final de cada columna abre un campo. `Enter` guarda, `Esc`
  cierra.
- **Editar**: pasa el ratón por una tarjeta y pulsa el lápiz. Puedes cambiar nombre,
  descripción, etiquetas, checklist y fecha.
- **Borrar**: pasa el ratón y pulsa la papelera dos veces. La barra de arriba ofrece
  **Deshacer** durante cinco segundos; después la tarjeta desaparece.
- **Mover**: arrastra una tarjeta dentro de una columna o a otra. La columna en la que
  cae decide lo que pasa después.
- **Completar**: el tic la mueve a HECHO y cierra su sesión.
- **Buscar** con la lupa, y **Paradas** filtra las tarjetas en progreso sin sesión.
- **Teclado**: `Enter` abre una tarjeta, `Alt` + flechas la mueve entre columnas o
  dentro de una, y el cambio se anuncia a los lectores de pantalla.

## Work Status

La sección de la barra lateral, siempre a mano mientras trabajas:

![La sección Work Status](docs/status.png)

- La **tarjeta en curso** va resaltada en ámbar, con su sesión y sus controles: elegir
  sesión, abrir una con `+`, devolverla a ideas con la flecha o completarla con el tic.
- La **píldora de modo** junto al nombre del tablero dice `Auto` o `Manual`; púlsala
  para cambiar la delegación sin abrir el panel.
- El **`+` de la cabecera** añade una idea sin salir del chat.
- Las **ideas** van debajo: el tic empieza una, la papelera la borra (con deshacer).

## Sesiones: manual y automático

Hay dos modos de delegación, en **Ajustes → Delegación** o desde la píldora:

- **Manual**: mover una tarjeta a EN PROGRESO solo cambia el tablero. La sesión la abres
  tú con el `+` de la tarjeta.
- **Automática**: al llegar a EN PROGRESO sale una tarjeta pequeña junto a ella
  preguntando si abrir la sesión. No se abre nada hasta que confirmas.

Lo que pasa después es igual en los dos modos:

- **HECHO**: la sesión recibe el cierre y se detiene. El vínculo se borra.
- **Volver a ideas**: la sesión se detiene y el vínculo se borra.
- Como el vínculo se borra, si vuelves a mover la tarjeta empieza una sesión **nueva**,
  sin el contexto viejo.

## Problemas

- **El agente no ve las herramientas**: tras actualizar la extensión, reinicia OpenCode
  para que cargue la versión nueva.
- **El panel y el Work Status se ven distintos**: son dos marcos separados. Recarga
  OpenChamber después de actualizar.
- **El tablero no cambia**: en modo Planka el panel lee de Planka; comprueba que la
  instancia está viva y que el token no ha caducado. Ajustes → Conexión muestra la
  cuenta o el error.
- **Ha desaparecido una tarjeta**: el borrado es definitivo pasados los cinco segundos
  de deshacer. Las etiquetas tienen su propia barra, también arriba.
- **No hay sonido**: no lo hay, a propósito. La extensión nunca reproduce audio.

## Licencia

MIT. Ver [LICENSE](LICENSE).
