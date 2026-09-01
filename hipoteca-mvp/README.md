# Hipoteca Clara — MVP

Este es el primer prototipo de una web española de calculadoras hipotecarias. Funciona sin servidor y no recoge datos personales: abre `index.html` en un navegador para probarlo.

## Qué incluye

- Herramienta principal de hipoteca y seis páginas SEO: cuota, amortización, cuánto pedir, hipoteca según sueldo, dinero necesario para comprar y fija frente a variable.
- Capital, intereses, total a devolver y tabla de amortización anual.
- Escenario fijo o variable inicial con aviso visible.
- Diseño adaptable a móvil y texto legal inicial.

## Antes de publicar

1. Intenta registrar `tucuentahipoteca.es` y, solo si lo consigues, conserva ese dominio en `robots.txt` y `sitemap.xml`.
2. Completa los campos entre corchetes de aviso legal y privacidad con tus datos reales y solicita revisión profesional antes de activarla comercialmente.
3. Publica esta carpeta en un alojamiento estático con HTTPS y configura el dominio.
4. Añade Google Search Console y analítica solo tras configurar el consentimiento de cookies.
5. Antes de crear calculadoras de impuestos o comparadores, prepara una tabla de datos con fuente oficial, fecha de vigencia y responsable de actualización.

## Publicación sin programar

Puedes subir esta carpeta a un servicio de alojamiento estático que permita arrastrar y soltar archivos. Después conectas el dominio y activas HTTPS desde el panel del proveedor. Para una web grande, la siguiente versión puede pasar a Next.js conservando el mismo motor de cálculo.

## Límites del cálculo

El resultado usa TIN, pagos mensuales y una cuota constante. No calcula TAE ni incluye seguros, productos vinculados, comisiones, impuestos, gastos de tasación/notaría ni cambios futuros de tipo. No es una oferta bancaria ni asesoramiento financiero.
