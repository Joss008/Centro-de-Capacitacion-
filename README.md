# Centro de Capacitación

Sistema web sencillo para administrar alumnos, profesores, cursos e inscripciones con HTML, CSS, JavaScript y Supabase.

## 1. Configurar Supabase

Abre `app.js` y reemplaza:

```js
const SUPABASE_URL = "PEGA_AQUI_TU_SUPABASE_URL";
const SUPABASE_KEY = "PEGA_AQUI_TU_SUPABASE_PUBLISHABLE_KEY";
```

Usa los valores de tu proyecto en **Supabase → Project Settings → API**:
- Project URL
- Publishable key (`sb_publishable_...`) o la clave `anon` heredada.

**No coloques nunca la `service_role` o una secret key en el navegador.** La publishable/anon key está diseñada para uso público y debe estar protegida mediante políticas RLS.

## 2. Políticas RLS para una práctica o demostración

Si las tablas tienen RLS activado y todavía no has configurado políticas, las operaciones pueden devolver errores como `new row violates row-level security policy`.

Para una demostración académica sin autenticación, puedes ejecutar estas políticas en el SQL Editor. Permiten lectura, inserción, actualización y eliminación a cualquier visitante que tenga la clave pública del proyecto.

```sql
-- SOLO PARA PROTOTIPO / DEMOSTRACIÓN PÚBLICA.
-- No usar así en un sistema con datos personales reales.

ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_demo_alumnos" ON public.alumnos
FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "acceso_demo_profesores" ON public.profesores
FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "acceso_demo_cursos" ON public.cursos
FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "acceso_demo_inscripciones" ON public.inscripciones
FOR ALL TO anon USING (true) WITH CHECK (true);
```

Para producción, implementa autenticación y políticas que restrinjan cada operación a usuarios autorizados. Las tablas contienen nombres y matrículas, por lo que no conviene dejarlas públicamente accesibles.

## 3. Ejecutar el sistema

1. Abre la carpeta en Visual Studio Code.
2. Configura la URL y la publishable key en `app.js`.
3. Ejecuta `index.html` con la extensión **Live Server**.
4. Comprueba que el indicador lateral diga **Conectado a Supabase**.

## 4. Relaciones utilizadas

- `cursos.id_profesor` → `profesores.id_profesor`
- `inscripciones.id_estudiante` → `alumnos.id_estudiante`
- `inscripciones.id_curso` → `cursos.id_curso`

El proyecto presupone que las tablas y nombres de columnas coinciden con el script SQL de creación.
