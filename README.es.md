# Kanban para OpenChamber

Español · [English](README.md)

**Un Kanban para [Planka](https://planka.app), y también un Kanban local sin Planka.**
Funciona dentro de OpenChamber: un tablero con tres columnas, una sección pequeña en la
barra lateral con lo que estás haciendo, y un agente que puede leer y mover tarjetas.

Puedes conectarlo a tu Planka, o elegir el tablero local y guardarlo todo en este
equipo: mismo tablero, mismas sesiones y ningún servidor. Si buscabas un Kanban local
dentro de OpenChamber, también sirve para eso.

![El tablero](docs/panel.png)

## Qué te llevas

- **Tres columnas**: IDEAS, EN PROGRESO y HECHO. Nada más.
- **Tarjetas** con nombre, descripción, etiquetas, checklist y fecha.
- **Sesiones**: cada tarjeta puede llevar una sesión de OpenChamber, y la abres desde
  ahí.
- **Modo automático o manual**: que el agente abra la sesión al mover la tarjeta, o
  abrirla tú.
- **Tres acabados visuales** para el tablero.
- **Un agente** que puede crear, mover, completar, editar y buscar tarjetas.

No es un gestor de proyectos: no hay sprints, ni horas, ni informes.

## Antes de empezar

- OpenChamber **2.7.0 o superior**.
- **O** una cuenta de Planka con su dirección, **o** nada: el tablero local funciona
  sin servidor.
- Solo si vas a compilar la extensión tú mismo: Node.js 20 o superior.

## Instalar

1. Abre **Ajustes → Extensiones** en OpenChamber.
2. Pulsa para añadir una extensión y elige **la carpeta de este proyecto**.
3. Aparece **Kanban** en la barra lateral. Ábrelo.

No hay que configurar nada más: la extensión ya declara su panel, su sección y sus
herramientas.

## Conectar con Planka

La primera vez el panel te pide tres cosas:

| Campo | Qué poner |
| --- | --- |
| Servidor | La dirección de tu Planka, por ejemplo `http://127.0.0.1:3040` |
| Correo o usuario | Tu cuenta de Planka |
| Contraseña | Tu contraseña de Planka |

La contraseña se usa **una vez** para pedir una llave de acceso y no se guarda. La
llave sí queda en un archivo de configuración junto a la extensión, en tu equipo, y no
se sube a ningún sitio.

Después eliges el tablero de Planka y a qué proyecto de OpenChamber pertenece. Las
sesiones de ese tablero se crearán en ese proyecto.

## Tablero local

Si no tienes Planka, abre **Ajustes → Conexión** y elige **Local**. Tendrás un tablero
con las tres listas y tres etiquetas, guardado en tu equipo.

- Es solo tuyo: no se ve desde el móvil ni desde otro ordenador.
- Puedes volver a Planka cuando quieras; no tendrás que entrar otra vez.
- Planka y local son tableros distintos: no se copian cosas de uno a otro.
- En **Copia del tablero** tienes **Copiar tablero** y **Restaurar** para guardar una
  copia del texto o recuperarla.

![Conexión y apariencia](docs/settings.png)

## El panel

- **Crear**: el `+` al final de una columna. Escribes y pulsas `Enter`.
- **Editar**: pasa el ratón por una tarjeta y pulsa el lápiz. Ahí cambias nombre,
  descripción, etiquetas, checklist y fecha.
- **Borrar**: la papelera. Hay que pulsarla **dos veces**; después tienes cinco
  segundos para **Deshacer** en la barra de arriba.
- **Mover**: arrastra la tarjeta dentro de una columna o a otra.
- **Completar**: el tic la manda a HECHO y cierra su sesión.
- **Buscar** con la lupa.
- **Paradas** filtra las tarjetas que están en EN PROGRESO **sin sesión**. Es la forma
  de ver lo que llevas tiempo aparcado y decidir si lo retomas o lo devuelves a ideas.

## Work Status

Es la sección de la barra lateral. Sirve para trabajar sin abrir el panel.

![Work Status](docs/status.png)

- Arriba, **la tarjeta en curso** en ámbar, con sus botones: elegir sesión, abrirla con
  `+`, devolverla a ideas con la flecha o completarla con el tic.
- Al lado del nombre del tablero, una etiqueta dice **Auto** o **Manual**; si la pulsas
  cambias el modo sin abrir nada.
- El **`+` de la cabecera** añade una idea sin salir del chat.
- Debajo, las **ideas**: el tic empieza una, la papelera la borra (también con
  deshacer).

## Sesiones: manual y automático

Eliges el modo en **Ajustes → Delegación** o desde la etiqueta del Work Status.

- **Manual**: mover una tarjeta a EN PROGRESO solo la mueve. La sesión la abres tú con
  el `+` de la tarjeta.
- **Automática**: al llegar a EN PROGRESO sale un aviso junto a la tarjeta preguntando
  si abrir la sesión. No se abre nada hasta que dices que sí.

Así se ve en cada sitio:

| | Manual | Automática |
| --- | --- | --- |
| **Work Status** | ![Manual en el Work Status](docs/session-status-manual.png) | ![Automática en el Work Status](docs/session-status-auto.png) |
| **Panel** | ![Manual en el panel](docs/session-panel-manual.png) | ![Automática en el panel](docs/session-panel-auto.png) |

En manual tienes el botón para abrirla cuando quieras. En automática, al mover la
tarjeta sale el aviso y decides ahí mismo.

Lo demás pasa igual en los dos modos:

- Al pasar a **HECHO**, la sesión recibe el cierre y se detiene.
- Al volver a **IDEAS**, la sesión se detiene y se suelta la tarjeta.
- Como la tarjeta se suelta, si la vuelves a mover empieza una sesión **nueva**, sin
  arrastrar la conversación anterior.
- Si una tarjeta se queda sin sesión, aparece en **Paradas**: ahí ves las que llevas
  tiempo sin abrir.

## Estilos

El mismo tablero con tres acabados. Se cambian en **Ajustes → Apariencia**.

![Los tres estilos](docs/styles.png)

- **Neumorfismo**: relieve suave, sombras difusas.
- **Brutalismo**: bordes duros, esquinas rectas, sombras sólidas.
- **Cristal**: fondos translúcidos con desenfoque.

## Problemas frecuentes

- **El agente no ve las tarjetas**: después de actualizar la extensión, reinicia
  OpenCode para que cargue la versión nueva.
- **El panel y la barra lateral no coinciden**: son dos zonas distintas; recarga
  OpenChamber.
- **El tablero no cambia**: en modo Planka, comprueba que Planka está encendido y que
  la sesión no ha caducado. En **Ajustes → Conexión** ves la cuenta o el error.
- **He borrado una tarjeta sin querer**: tienes cinco segundos de **Deshacer**. Pasado
  ese tiempo, no se puede recuperar.
- **No hay sonido**: no lo hay, a propósito.

## Licencia

MIT. Ver [LICENSE](LICENSE).
