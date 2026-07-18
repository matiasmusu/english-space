-- Corrige el error "permission denied for table ..." (código 42501).
--
-- Los proyectos nuevos de Supabase ya no otorgan permisos automáticos sobre
-- las tablas creadas por SQL: además de las políticas RLS (que ya existen),
-- hace falta el GRANT clásico de PostgreSQL para el rol "authenticated".
--
-- Ejecutar completo en Supabase > SQL Editor. Es seguro correrlo más de una vez.
-- No se otorga nada al rol "anon": sin iniciar sesión no se puede leer nada.

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;

-- Cubre también cualquier tabla que se cree en el futuro.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
