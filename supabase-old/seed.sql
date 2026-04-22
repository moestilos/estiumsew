-- ============================================================
--  estiumsew · Seed Data
--  Productos iniciales de la tienda de Fani
--  Ejecuta DESPUÉS de schema.sql
-- ============================================================

-- Nota: las imágenes se subirán desde el panel de administración.
-- Por ahora los productos se insertan sin imagen (imagen_url = null).

insert into public.productos
  (nombre, descripcion, precio, categoria, activo, wide, orden)
values
  (
    'Bolso Margarita',
    'Bolso de tela bordado a mano con flores de margarita. Asa larga y cierre de cremallera. Perfecto para el día a día.',
    45.00, 'Bolsas', true, true, 1
  ),
  (
    'Neceser Vichy',
    'Neceser en tela vichy con forro impermeable. Ideal para viajes o para tener todo ordenado en el baño.',
    22.00, 'Neceseres', true, false, 2
  ),
  (
    'Funda Tablet Lino',
    'Funda para tablet en lino natural con cierre de botón de madera. Compatible con tablets de hasta 11 pulgadas.',
    28.00, 'Fundas', true, false, 3
  ),
  (
    'Set Cocina Provenzal',
    'Set de cocina compuesto por delantal y manopla a juego. Tela de algodón 100% con motivos provenzales.',
    38.00, 'Sets', true, false, 4
  ),
  (
    'Bolso Tote Rayas',
    'Bolso tote en tela de rayas marineras. Amplio, resistente y con bolsillo interior. El complemento perfecto para la playa o el mercado.',
    32.00, 'Bolsas', true, false, 5
  ),
  (
    'Neceser Flores Silvestres',
    'Pequeño neceser bordado a mano con flores silvestres en tonos tierra. Forro de tela impermeable.',
    25.00, 'Neceseres', true, false, 6
  ),
  (
    'Servilletas Bordadas',
    'Juego de 4 servilletas de algodón con bordado a mano en esquinas. Lavables y duraderas.',
    18.00, 'Cocina', true, false, 7
  ),
  (
    'Funda Libro Personalizada',
    'Funda para libro hecha a medida en tela de tu elección. Incluye marcapáginas a juego.',
    16.00, 'Fundas', true, false, 8
  ),
  (
    'Set Neceser + Bolsito',
    'Set coordinado compuesto por neceser mediano y bolsito de mano. Ideal como regalo.',
    48.00, 'Sets', true, true, 9
  ),
  (
    'Cesta Organizadora',
    'Cesta de tela con asa trenzada, perfecta para organizar el baño, el salón o el cuarto de los peques.',
    30.00, 'Accesorios', true, false, 10
  ),
  (
    'Broche Tela Artesanal',
    'Broche floral hecho a mano con tela y relleno de guata. Disponible en varios colores.',
    8.00, 'Accesorios', true, false, 11
  );
