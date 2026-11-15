# Kanban para OpenChamber

Español · [English](README.md)

**Un Kanban para [Planka](https://planka.app), y también un tablero local sin Planka.**
Funciona dentro de OpenChamber: tres columnas, una sección en el chat con lo que estás
haciendo y un agente que puede leer y mover tarjetas.

Conéctalo a tu Planka o guárdalo todo en este equipo. La interfaz está en español.

<img src="docs/panel.png" width="620" alt="El tablero: tres columnas con tarjetas">

## Índice

- [Qué te llevas](#qué-te-llevas) · [Instalar](#instalar) · [Dónde está](#dónde-está) · [Actualizar](#actualizar)
- [Conectar con Planka](#conectar-con-planka) · [Tablero local](#tablero-local) · [El panel](#el-panel) · [Work Status](#work-status)
- [Sesiones: manual y automático](#sesiones-manual-y-automático) · [Estilos](#estilos) · [Problemas frecuentes](#problemas-frecuentes) · [Licencia](#licencia)

## Qué te llevas

- **Tres columnas**: IDEAS, EN PROGRESO y HECHO. Nada más.
- **Tableros**: crea un tablero de Planka con sus tres columnas desde el panel, o añade
  las columnas a uno vacío.
- **Tarjetas** con título, detalles y una sesión.
- **Sesiones**: la tarjeta sigue a su sesión de OpenChamber mientras trabaja.
- **Manual o automático**: abre la sesión tú, o deja que el agente pregunte antes.
- **Un tablero local por proyecto**: el mismo tablero, sin servidor.
- **Tres acabados visuales** para el tablero.
- **Un agente** que crea, mueve, completa, edita y busca tarjetas.

No es un gestor de proyectos: sin sprints, estimaciones ni informes.

## Instalar

Instálala desde la URL del repositorio. La URL de git es la única instalación que
OpenChamber puede actualizar; las de carpeta y ZIP nunca se actualizan.

```
https://github.com/SMBX7/openchamber-extension-kanban.git
```

1. Abre **Ajustes → Extensiones**.
2. Pega la URL en **Carpeta, ZIP o URL** y pulsa **Añadir**.
3. Revisa los permisos y elige **Permitir y activar**. El icono de **Kanban** aparece
   en la barra lateral derecha; ábrelo desde ahí.

Necesita OpenChamber **2.7.0 o superior**.

### Dónde está

La extensión aparece en tres sitios de OpenChamber, y solo uno se configura:

- **El panel, en la barra lateral derecha.** Es el icono de Kanban. Ahí está el tablero
  y ahí se conecta y se configura: la primera vez pide la conexión con Planka, y después
  **Ajustes de Kanban → Conexión** cambia la cuenta, el servidor o el modo local. Si no
  ves el icono, muestra la barra lateral derecha con «Mostrar u ocultar barra lateral
  derecha».
- **La sección Kanban del chat (Work Status).** Enseña lo que está en progreso y las
  ideas para trabajar sin abrir el panel; no configura nada.
- **La página completa.** Se abre desde **Páginas de extensiones**, encima de la lista
  de sesiones: el mismo tablero a pantalla completa, con la misma configuración.

### Para una IA

- Usa la URL de git de arriba; no descargues un ZIP, no lo clones y no apuntes
  OpenChamber a una carpeta.
- Instálala desde los Ajustes de OpenChamber: la CLI `openchamber` no instala
  extensiones.
- No edites la copia instalada; una actualización la reemplaza.
- Comprueba que **Kanban** está en la barra lateral derecha y que la versión de la tarjeta
  coincide con el `version` del `package.json`.
- Explica cómo actualizar: **Ajustes → Extensiones → Buscar actualizaciones →
  Actualizar**.

### Actualizar

Abrir **Ajustes → Extensiones** comprueba las instalaciones de git una vez por hora;
**Buscar actualizaciones** comprueba al momento. Si hay una versión nueva, pulsa
**Actualizar**; los permisos, las cuentas y los ajustes se conservan. Sin sufijo, la URL
sigue `main`; añade `#v1.2.0` o `#stable` para fijar una etiqueta o una rama. Publicar
una versión es subir el `version` de `package.json` y hacer push.

## Conectar con Planka

La primera vez, el panel pide tres cosas:

| Campo | Qué poner |
| --- | --- |
| Servidor | La dirección de tu Planka, por ejemplo `http://127.0.0.1:3040` |
| Correo o usuario | Tu cuenta de Planka |
| Contraseña | Tu contraseña de Planka |

La contraseña se usa una vez para pedir una llave de acceso y no se guarda. La llave
queda en un archivo de configuración junto a la extensión, en tu equipo, y no se sube a
ningún sitio. Después eliges el tablero de Planka y el proyecto de OpenChamber al que
pertenecen sus sesiones.

## Tablero local

Elige **Local** en **Ajustes → Conexión**. Tienes las tres columnas guardadas en este
equipo.

- Solo tuyo: no se ve desde otro dispositivo.
- Un tablero por proyecto de OpenChamber; al cambiar de proyecto cambias de tablero.
- Planka y local son distintos: no se copia nada entre ellos, y puedes volver a Planka
  cuando quieras sin entrar otra vez.
- **Descargar MD** y **Descargar CSV** escriben `kanban-AAAA-MM-DD.md` y `.csv` en tu
  carpeta de Descargas, para leerlos y compartirlos.
- **Copia JSON** escribe el tablero completo; es el único formato que se puede volver a
  cargar con **Importar copia…**.

El archivo lo escribe la extensión donde corre OpenChamber, no el navegador.

<img src="docs/settings.png" width="460" alt="Conexión: Planka o el tablero local">

## El panel

Se abre con el icono de **Kanban** de la barra lateral derecha. Aquí también se conecta
con Planka y se cambian los ajustes.

<img src="docs/panel-header.png" width="320" alt="La cabecera del panel con el tablero y la pastilla de vincular">

La cabecera lleva el tablero y, a su lado, la **pastilla que lo vincula al proyecto**:
pone «Vincular» hasta que la pulsas y después muestra el nombre del proyecto con un tic.
Cuando la sesión ya dice a qué proyecto pertenece, el selector de proyecto no aparece.

- **Crear**: el `+` junto al título de una columna abre el recuadro encima de las
  tarjetas. Escribe un título y una descripción opcional; `Enter` o **Crear** lo guarda.
  Los dos campos crecen mientras escribes —el título hasta dos líneas y la descripción
  hasta cuatro— y después hacen scroll por dentro. `Mayús+Enter` salta de línea.
- **Editar**: el lápiz, un doble clic en la tarjeta o `Enter` con la tarjeta enfocada
  abre la tarjeta. Ahí cambias título, detalles y sesión; **Confirmar** guarda y cierra,
  **Cancelar** descarta.
- **Punto de sesión**: el punto a la izquierda del lápiz muestra el estado de la sesión,
  y solo mientras la tarjeta está en EN PROGRESO.
- **Borrar**: dentro del editor, pulsa **Eliminar tarjeta** dos veces; tienes cinco
  segundos de **Deshacer**.
- **Mover**: arrastra la tarjeta dentro de una columna o a otra. Al arrastrarla a HECHO
  queda completada. Una tarjeta con su propia sesión se mueve allí cuando esa sesión
  termina su turno; en un lote, la mueve el agente principal tras revisar a su subagente.
  Lo que muevas a mano no se toca.
- **Ordenar IDEAS**: **Ordenar** ordena por **Rápido** (lo pequeño primero) o
  **Complejo** (rediseños y cambios de interfaz primero).
- **Buscar** con la lupa.
- **Paradas** filtra las tarjetas de EN PROGRESO **sin una sesión activa**.

## Work Status

La sección de Work Status del chat; sirve para trabajar sin abrir el panel de la barra
lateral derecha.

<img src="docs/status.png" width="420" alt="La sección Work Status">

- Todas las tarjetas de EN PROGRESO en ámbar, con sus botones: elegir su sesión,
  abrirla o crear una con `+`; devolver la tarjeta a ideas con la flecha o completarla
  con el tic.
- Los títulos se recortan a dos líneas; pulsa el texto o la flecha para leerlo entero, o
  el lápiz para editarlo.
- La etiqueta **Auto**/**Manual** junto al nombre del tablero cambia el modo.
- El **`+` de la cabecera** añade una idea.
- Debajo, las ideas: el tic empieza una, la papelera la borra (con deshacer).
- Una tarjeta de EN PROGRESO sin sesión aparece en **Paradas**.

### Desde el chat

Escribe `@` en el composer y elige **Tarjetas**: primero sale EN PROGRESO y después IDEAS,
con la columna en cada fila. La lista es corta: escribe para buscar por título o detalles,
y un título exacto sale primero. Al elegir una tarjeta que siga en IDEAS, pasa a EN
PROGRESO. El chip le pasa al agente el título, el id, la columna y los detalles, así puede
trabajar la tarjeta sin abrir el panel. Las de HECHO quedan fuera.

## Sesiones: manual y automático

Elige el modo en **Ajustes → Delegación** o desde la etiqueta del Work Status. Cuando
trabajas desde un chat, esa sesión es la que toma las tarjetas: cada una va a un
subagente, y varias a la vez van en paralelo, cada una con sus archivos.

- **Manual**: al trabajar una tarjeta desde el chat queda vinculada a esa sesión, así
  que el Work Status deja de decir que no tiene sesión. Abre el lote
  con el `+` del Work Status cuando quieras que el agente la trabaje. Los dos modos van por
  lotes con subagentes. El agente trabaja la tarjeta y la deja en EN PROGRESO avisando de
  que está lista: tú la revisas, la pasas a HECHO y pides el resumen cuando el lote esté
  listo. Referenciar una tarjeta en el chat para trabajar en ella —con `@` o por su
  nombre— la pasa a EN PROGRESO si aún está en IDEAS.
- **Automática**: el aviso pregunta antes de sumar cada tarjeta al lote, así que ninguna
  entra sin avisar. El agente revisa cada subagente, mueve la tarjeta a HECHO y resume al
  terminar el lote; la sesión sigue abierta para que la archives.

Cuando un agente toma una tarjeta, la extensión la vincula a esa sesión: pasa a EN
PROGRESO al vincularse. Un lote sigue abierto mientras le quede alguna tarjeta fuera de
HECHO. En automático, cuando llega la última, la sesión revisa el conjunto y escribe el resumen;
en manual espera a que cierres el lote desde la columna HECHO. En los dos, la sesión sigue
abierta para que la archives:

- Pasar a **HECHO** termina la tarjeta: deja de apuntar a su sesión, así que el punto de
  sesión no sobrevive al movimiento y la sesión queda abierta para que la archives.
  Dentro de un lote, las tarjetas mantienen sus vínculos hasta que el lote termina.
- **Cerrar lote/lotes** en la columna HECHO pide el resumen de cada sesión vinculada una
  vez y suelta sus tarjetas; la sesión sigue abierta para que la archives.
- Volver a **IDEAS** suelta la tarjeta. En un lote solo sale esa tarjeta: la sesión sigue
  con las demás.

### El tablero del agente

El panel sigue al proyecto de la sesión en la que está abierto: una sesión creada en un
proyecto muestra el tablero de ese proyecto, y al cambiar a una sesión de otro proyecto
cambia el tablero. Elegir un tablero en el panel lo vincula a ese proyecto, así que la
siguiente sesión lo muestra sin preguntar. Cuando un proyecto tiene varios tableros y
ninguno está fijado, el panel se queda con el que tiene en vez de adivinar. Sin proyecto,
el tablero sigue como lo dejaste.

El panel y el agente son dos procesos distintos. El panel sigue la conexión que ves aquí;
las herramientas del agente deciden su tablero según el proyecto en el que se abrió la
sesión. Vincúlalo una vez por proyecto con la **pastilla de al lado del selector de
tablero**: pone «Vincular» hasta que la pulsas, luego muestra el nombre del proyecto, y al
volver a pulsarla se suelta. Mientras un proyecto tenga varios
tableros y ninguno esté fijado, el agente se niega a tocar tarjetas en vez de adivinar. Un
worktree o una subcarpeta del proyecto hereda el tablero fijado.

## Estilos

Se cambian en **Ajustes → Apariencia**.

<img src="docs/styles.png" width="700" alt="Los tres estilos de tarjeta">

- **Neumorfismo**: relieve suave, sombras difusas.
- **Brutalismo**: bordes duros, esquinas rectas, sombras sólidas.
- **Cristal**: fondos translúcidos con desenfoque.

## Problemas frecuentes

<details>
<summary>Abrir la lista de problemas</summary>

- **Kanban no aparece en la barra lateral derecha**: actívalo en **Ajustes → Extensiones**
  y recarga OpenChamber.
- **No encuentro dónde configurar la extensión**: no está en la lista de sesiones; el
  icono vive en la barra lateral derecha. Muéstrala con «Mostrar u ocultar barra lateral
  derecha» y abre **Kanban**.
- **El agente no ve las tarjetas**: reinicia OpenCode después de actualizar la extensión.
- **El agente se niega a tocar tarjetas**: su tablero sigue al proyecto de la sesión. Abre
  el tablero que quieras y pulsa la pastilla junto al selector de tablero.
- **El panel y la sección Work Status no coinciden**: son zonas distintas; recarga
  OpenChamber.
- **El tablero no cambia**: en modo Planka, comprueba que Planka está encendido y que la
  sesión no ha caducado; **Ajustes → Conexión** muestra la cuenta o el error.
- **He borrado una tarjeta sin querer**: **Deshacer** dura cinco segundos.

</details>

## Licencia

MIT. Ver [LICENSE](LICENSE).
