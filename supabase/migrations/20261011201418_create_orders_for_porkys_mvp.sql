/*
# Create Porky's order storage

1. New Tables
- `porkys_orders` stores every order created from the operations panel.
- `id` is the generated order identifier.
- `customer_name`, `phone`, and `delivery_address` store the customer and delivery details.
- `items` stores the selected products, unit prices, and quantities as JSON.
- `total`, `delivery_type`, `payment_method`, `status`, and `created_at` store the order summary and operational state.

2. Security
- Row level security is enabled on `porkys_orders`.
- This MVP is a shared single-restaurant workspace without real account authentication, so anon and authenticated roles can perform the four explicit CRUD operations.

3. Important Notes
- Existing data is not modified or removed.
- The total is supplied by the application after calculating the cart contents.
*/

CREATE TABLE IF NOT EXISTS public.porkys_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  delivery_address text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(10, 2) NOT NULL DEFAULT 0,
  delivery_type text NOT NULL DEFAULT 'Delivery',
  payment_method text NOT NULL DEFAULT 'Efectivo',
  status text NOT NULL DEFAULT 'Pendiente',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.porkys_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "porkys_orders_select" ON public.porkys_orders;
CREATE POLICY "porkys_orders_select" ON public.porkys_orders
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "porkys_orders_insert" ON public.porkys_orders;
CREATE POLICY "porkys_orders_insert" ON public.porkys_orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "porkys_orders_update" ON public.porkys_orders;
CREATE POLICY "porkys_orders_update" ON public.porkys_orders
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "porkys_orders_delete" ON public.porkys_orders;
CREATE POLICY "porkys_orders_delete" ON public.porkys_orders
  FOR DELETE TO anon, authenticated USING (true);