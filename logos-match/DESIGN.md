# Guía de Diseño

Este documento establece las pautas fundamentales de diseño para el proyecto, asegurando consistencia visual y coherencia en la interfaz de usuario.

## 1. Estado de Ánimo Conceptual (Mood)

El diseño general de la aplicación debe transmitir los siguientes conceptos clave:

- **Moderno**: Interfaces limpias, con suficiente espacio en blanco, interacciones fluidas y componentes actualizados.
- **Espiritual**: Un enfoque sereno, que invite a la calma y a la reflexión.
- **Limpio (Clean)**: Sin distracciones innecesarias, minimalista, priorizando el contenido y la usabilidad.

## 2. Paleta de Colores

La paleta de colores refleja el estado de ánimo deseado, combinando tonos cálidos y fríos para lograr equilibrio.

### Colores Principales

- **Dorados / Ámbar (Golden/Amber)**: Utilizados para resaltar elementos importantes, llamadas a la acción (CTAs) y detalles que aportan calidez e iluminación espiritual.
- **Azules Profundos (Deep Blues)**: Colores primarios para fondos oscuros, tipografía principal y elementos de confianza. Transmiten serenidad y profundidad.
- **Grises Cálidos / Blancos (Warm Grays/Whites)**: Utilizados para fondos principales, tarjetas y superficies. Aportan luminosidad y mantienen la interfaz limpia sin ser excesivamente fríos.

## 3. Uso de Colores en Tailwind CSS

A continuación, se sugiere cómo mapear la paleta conceptual a las clases de utilidad de Tailwind CSS:

- **Dorados / Ámbar**:
  - `bg-amber-500` / `text-amber-500` para acentos principales.
  - `bg-amber-600` para estados *hover* en botones principales.
  - `text-amber-700` para textos resaltados sobre fondos claros.
- **Azules Profundos**:
  - `bg-slate-900` o `bg-blue-950` para fondos de secciones oscuras o *footers*.
  - `text-slate-800` o `text-blue-900` para encabezados y texto principal de alto contraste.
- **Grises Cálidos / Blancos**:
  - `bg-stone-50` o `bg-orange-50` para el fondo principal de la aplicación.
  - `bg-white` para tarjetas (cards) y modales.
  - `text-stone-600` para texto secundario o descripciones.

## 4. Tipografía

La tipografía debe ser legible, elegante y complementar la estética moderna y espiritual.

- **Fuentes (Fonts)**:
  - **Encabezados (Headings)**: Se recomienda una fuente Serif elegante (ej. *Merriweather* o *Playfair Display*) o una Sans-Serif geométrica y limpia (ej. *Inter* o *Montserrat*) para mantener el toque moderno.
  - **Cuerpo (Body Text)**: Una fuente Sans-Serif altamente legible como *Inter*, *Roboto* o *Open Sans*.
- **Jerarquía**:
  - **H1**: `text-4xl` o `text-5xl`, `font-bold`, `tracking-tight`.
  - **H2**: `text-3xl`, `font-semibold`.
  - **H3**: `text-2xl`, `font-medium`.
  - **Cuerpo**: `text-base` o `text-lg`, con un interlineado generoso (`leading-relaxed`) para mejorar la lectura y dar una sensación de respiro.

## 5. Bordes y Radios (Borders & Radii)

Para mantener la estética moderna y suave:

- **Radios de borde (Border Radius)**:
  - Utilizar `rounded-lg` o `rounded-xl` para tarjetas y modales, suavizando las esquinas para una sensación más amigable.
  - Botones con `rounded-full` (forma de píldora) o `rounded-md` para un aspecto moderno y pulcro.
- **Grosor y Color de Borde**:
  - Bordes sutiles y delicados: `border`, `border-stone-200` o `border-slate-200/50`.
  - Evitar bordes gruesos y oscuros, a menos que sea estrictamente necesario para accesibilidad.

## 6. Sombras (Shadows)

Las sombras deben ser suaves y difusas para crear profundidad sin ensuciar la interfaz, aportando a la sensación de elementos "flotantes" o ligeros.

- **Tarjetas y Contenedores**:
  - Estado normal: `shadow-sm` o `shadow-md` con baja opacidad (ej. sombra con color de tinte azulado o gris cálido).
  - Estado *hover*: `shadow-lg` o `shadow-xl` para indicar interactividad, manteniendo la transición suave (`transition-shadow duration-300`).
- **Modales y Dropdowns**:
  - `shadow-2xl` para asegurar que destaquen sobre el contenido de fondo.
