-- Porky's MVP: catálogo inicial y operaciones transaccionales.
-- Productos de demostración; INSERT idempotente por nombre.
INSERT INTO public.producto (nombre, descripcion, precio, disponible)
SELECT seed.nombre, seed.descripcion, seed.precio, TRUE
FROM (VALUES
  ('1/4 Pollo a la brasa', 'Cuarto de pollo a la brasa', 18.90::numeric),
  ('1/2 Pollo a la brasa', 'Medio pollo a la brasa', 31.90::numeric),
  ('Costillas BBQ', 'Costillas bañadas en salsa BBQ', 24.90::numeric),
  ('Hamburguesa Clásica', 'Hamburguesa clásica de la casa', 16.50::numeric),
  ('Papas fritas familiares', 'Porción familiar de papas fritas', 11.90::numeric),
  ('Gaseosa personal', 'Gaseosa personal', 4.50::numeric)
) AS seed(nombre, descripcion, precio)
WHERE NOT EXISTS (
  SELECT 1 FROM public.producto p WHERE lower(p.nombre) = lower(seed.nombre)
);

-- Registra cliente, pedido y detalle dentro de una sola transacción.
CREATE OR REPLACE FUNCTION public.registrar_pedido(
  p_nombre text,
  p_apellido text,
  p_telefono text,
  p_direccion text,
  p_items jsonb
)
RETURNS TABLE(id_pedido integer, fecha_hora timestamp without time zone, total numeric)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cliente_id integer;
  v_pedido_id integer;
  v_total numeric(10,2);
  v_fecha_hora timestamp without time zone;
BEGIN
  IF trim(coalesce(p_nombre, '')) = '' THEN
    RAISE EXCEPTION 'El nombre del cliente es obligatorio';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido debe contener al menos un producto';
  END IF;

  IF nullif(trim(coalesce(p_telefono, '')), '') IS NOT NULL THEN
    SELECT c.id_cliente INTO v_cliente_id
    FROM public.cliente c
    WHERE c.telefono = trim(p_telefono)
    ORDER BY c.id_cliente
    LIMIT 1;
  END IF;

  IF v_cliente_id IS NULL THEN
    INSERT INTO public.cliente(nombre, apellido, telefono, direccion)
    VALUES (trim(p_nombre), coalesce(nullif(trim(p_apellido), ''), 'Sin apellido'), nullif(trim(p_telefono), ''), nullif(trim(p_direccion), ''))
    RETURNING cliente.id_cliente INTO v_cliente_id;
  ELSE
    UPDATE public.cliente
    SET nombre = trim(p_nombre),
        apellido = coalesce(nullif(trim(p_apellido), ''), 'Sin apellido'),
        direccion = coalesce(nullif(trim(p_direccion), ''), direccion)
    WHERE cliente.id_cliente = v_cliente_id;
  END IF;

  -- Calcula el total usando los precios unitarios enviados desde el carrito.
  SELECT round(sum((item->>'cantidad')::integer * (item->>'precio_unitario')::numeric), 2)
  INTO v_total
  FROM jsonb_array_elements(p_items) item;

  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'El total del pedido debe ser mayor a cero';
  END IF;

  INSERT INTO public.pedido(id_cliente, total, estado)
  VALUES (v_cliente_id, v_total, 'Pendiente')
  RETURNING pedido.id_pedido, pedido.fecha_hora INTO v_pedido_id, v_fecha_hora;

  INSERT INTO public.detalle_pedido(id_pedido, id_producto, cantidad, precio_unitario)
  SELECT v_pedido_id,
         (item->>'id_producto')::integer,
         (item->>'cantidad')::integer,
         (item->>'precio_unitario')::numeric
  FROM jsonb_array_elements(p_items) item;

  id_pedido := v_pedido_id;
  fecha_hora := v_fecha_hora;
  total := v_total;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_pedido(text, text, text, text, jsonb) TO anon, authenticated;

-- Persiste una ejecución y todas sus predicciones de forma atómica.
CREATE OR REPLACE FUNCTION public.guardar_predicciones(
  p_algoritmo text,
  p_predicciones jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_ejecucion_id integer;
BEGIN
  IF jsonb_typeof(p_predicciones) <> 'array' OR jsonb_array_length(p_predicciones) = 0 THEN
    RAISE EXCEPTION 'No hay predicciones para guardar';
  END IF;

  INSERT INTO public.ejecucion_prediccion(algoritmo)
  VALUES (coalesce(nullif(trim(p_algoritmo), ''), 'KNN'))
  RETURNING ejecucion_prediccion.id_ejecucion INTO v_ejecucion_id;

  INSERT INTO public.prediccion_demanda(id_ejecucion, periodo_predicho, cantidad_estimada)
  SELECT v_ejecucion_id,
         (item->>'periodo_predicho')::timestamp,
         (item->>'cantidad_estimada')::numeric
  FROM jsonb_array_elements(p_predicciones) item;

  RETURN v_ejecucion_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guardar_predicciones(text, jsonb) TO anon, authenticated;
