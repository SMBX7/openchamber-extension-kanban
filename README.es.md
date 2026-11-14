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
- **Tableros**: crea un tablero de Planka con sus tres columnas desde la extensión, y
  añade las columnas a uno que llegue vacío.
- **Tarjetas** con título, detalles y una sesión asignada.
- **Sesiones**: cada tarjeta puede llevar una sesión de OpenChamber; la tarjeta sigue a
  esa sesión mientras trabaja.
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
- **Un tablero por proyecto**: cada proyecto de OpenChamber guarda su propio tablero
  local. Un proyecto nuevo empieza vacío; al volver se recuperan sus listas y tarjetas.
- **Descargar MD** y **Descargar CSV** escriben el tablero en tu carpeta de Descargas
  como `kanban-AAAA-MM-DD.md` o `.csv`, para leerlo o compartirlo.
- **Copia JSON** escribe el tablero completo. Es el único formato que se puede volver a
  cargar.
- **Importar copia…** abre el selector de archivos y restaura ese JSON.

Cada proyecto tiene su archivo, escrito por la extensión en el equipo donde corre
OpenChamber, no por el navegador. Si usas OpenChamber en remoto, el archivo aparece en ese equipo.

![Conexión y apariencia](docs/settings.png)

## El panel

- **Crear**: el `+` al lado del título de la columna. Escribes un título y pulsas `Enter`.
- **Editar la tarjeta**: pasa el ratón y pulsa el lápiz (o `Enter` con la tarjeta
  enfocada). Ahí cambias título, detalles y sesión; **Confirmar** guarda y cierra,
  **Cancelar** descarta.
- **Borrar**: dentro del editor, pulsa **Eliminar tarjeta** dos veces; después tienes
  cinco segundos de **Deshacer** en la barra de arriba.
- **Mover**: arrastra la tarjeta dentro de una columna o a otra.
- **Ordenar IDEAS**: el botón **Ordenar** de la cabecera de IDEAS abre los cuatro
  criterios y reordena las tarjetas por prioridad.
- **Completar**: el tic la manda a HECHO. Si la tarjeta está vinculada a una sesión,
  pasa a HECHO automáticamente cuando esa sesión termina su turno; solo se mueve esa
  tarjeta. Lo que muevas tú a mano no se toca.
- **Buscar** con la lupa.
- **Paradas** filtra las tarjetas que están en EN PROGRESO **sin sesión**. Es la forma
  de ver lo que llevas tiempo aparcado y decidir si lo retomas o lo devuelves a ideas.

## Estado del trabajo

Es la sección de la barra lateral. Sirve para trabajar sin abrir el panel.

![Estado del trabajo](docs/status.png)

- Arriba, **todas las tarjetas de EN PROGRESO** en ámbar, cada una con sus botones:
  elegir sesión, abrirla con `+`, devolverla a ideas con la flecha o completarla con el
  tic.
- Los títulos se recortan a dos líneas. Pulsa el texto o la flecha para expandirlo y
  leerlo entero; el lápiz sigue sirviendo para editar.
- Al lado del nombre del tablero, una etiqueta dice **Auto** o **Manual**; si la pulsas
  cambias el modo sin abrir nada.
- El **`+` de la cabecera** añade una idea sin salir del chat.
- Debajo, las **ideas**: el tic empieza una, la papelera la borra (también con
  deshacer).

## Sesiones: manual y automático

Eliges el modo en **Ajustes → Delegación** o desde la etiqueta del Estado del trabajo.

- **Manual**: mover una tarjeta a EN PROGRESO solo la mueve. La sesión la abres tú con
  el `+` de la tarjeta.
- **Automática**: al llegar a EN PROGRESO sale un aviso junto a la tarjeta preguntando
  si abrir la sesión. No se abre nada hasta que dices que sí.

En manual tienes el botón para abrirla cuando quieras. En automática, al mover la
tarjeta sale el aviso y decides ahí mismo.

Cuando delegas una tarjeta a un agente, se vincula a la sesión de ese agente (lo hacen
las herramientas de la extensión). La tarjeta pasa a EN PROGRESO al vincularse y a
HECHO cuando esa sesión termina su turno; solo se mueve esa tarjeta. Lo que muevas tú a
mano no se toca.

Lo demás pasa igual en los dos modos:

- Al pasar a **HECHO**, la sesión sigue abierta. La columna HECHO tiene un botón para
  cerrar las sesiones; cierra cada sesión distinta una vez, aunque varias tarjetas la
  compartan, y borra todos sus vínculos.
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
