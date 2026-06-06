-- Restrict service order deletion to admins only.

drop policy if exists "Admins can delete service orders" on public.service_orders;
create policy "Admins can delete service orders"
  on public.service_orders
  for delete
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or lower(coalesce(auth.jwt() ->> 'email', '')) in ('gutiajs@gmail.com')
  );

grant delete on public.service_orders to authenticated;
