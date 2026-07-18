# English Space

Aplicación colaborativa para Matías y Romina. Usa Next.js, Supabase Auth, PostgreSQL y Storage privado. Los datos son compartidos entre ambos dispositivos.

## Si ya tenés la app publicada (actualización)

Esta versión trae un `package-lock.json` limpio generado contra el registro público de npm. Después de actualizar el código en GitHub:

1. En Vercel, ir a **Settings > Build & Development Settings**.
2. Borrar el override del **Install Command** (`npm install --package-lock=false ...`) y dejar que Vercel use el comando por defecto (`npm ci` / detección automática).
3. Hacer redeploy.

No hace falta tocar Supabase ni las variables de entorno: el esquema y las claves existentes siguen siendo compatibles.

### Si la subida de archivos falla

Ahora la app muestra el error real en pantalla. Los dos casos más comunes:

- **"No se encontró el espacio de archivos"**: en Supabase, ir a **Storage** y verificar que exista el bucket `english-space` (privado). Si no existe, crearlo con ese nombre exacto.
- **"Supabase rechazó la operación por permisos"**: las políticas de Storage no se aplicaron. En **Storage > Policies** del bucket `english-space`, crear políticas para usuarios autenticados (`authenticated`) que permitan SELECT, INSERT, UPDATE y DELETE, o volver a ejecutar la parte de `storage.objects` de `supabase/schema.sql`.

## Puesta en marcha rápida

### 1. Crear Supabase

1. Crear un proyecto gratuito en Supabase.
2. Abrir **SQL Editor > New query**.
3. Copiar y ejecutar completo `supabase/schema.sql`.
4. En **Authentication > Providers > Email**, desactivar temporalmente **Confirm email** para que las dos cuentas puedan usarse inmediatamente.

No hace falta crear usuarios desde el panel: Matías y Romina los crean desde la propia web.

### 2. Conseguir las claves

En Supabase, abrir **Project Settings > API** y copiar:

- Project URL
- Publishable key (o anon public key)

Nunca usar `service_role` en este proyecto.

### 3. Publicar en Vercel

La forma más sencilla es subir esta carpeta a un repositorio privado de GitHub e importarlo desde Vercel.

En Vercel agregar estas variables en **Settings > Environment Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
REGISTRATION_CODE=UN_CODIGO_PRIVADO
```

`REGISTRATION_CODE` es una contraseña compartida solamente para permitir la creación de las dos cuentas. No se muestra en el navegador ni queda incluida en el código.

### 4. Crear las cuentas desde la web

1. Abrir la URL de Vercel.
2. Elegir **Crear cuenta**.
3. Matías carga su nombre, correo, contraseña, perfil **Alumno** y el código privado.
4. Romina hace lo mismo con perfil **Profesora**.
5. Ambos ya pueden ingresar y usar el mismo espacio.

Los roles son informativos: los dos pueden crear, editar, responder, corregir, comentar y subir archivos.

### 5. Cerrar el registro (opcional)

Después de crear las dos cuentas, podés cambiar `REGISTRATION_CODE` en Vercel por otro valor largo que nadie conozca. Así nadie más podrá registrarse aunque tenga la URL.

## Prueba local opcional

Copiar `.env.example` a `.env.local`, completar los valores y ejecutar:

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Funciones incluidas

- Login y registro independiente para Matías y Romina.
- Ambos pueden crear actividades y cambiar estados.
- Respuestas, correcciones en rojo, comentarios y notas de clase con autor y fecha.
- Materiales: libros, links, PDFs, imágenes, audio y video.
- Archivos privados con enlaces temporales.
- Cuaderno digital con varias fotos o PDFs.
- Datos sincronizados entre dispositivos mediante Supabase.
