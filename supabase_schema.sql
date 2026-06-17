-- ========================================================
-- ESQUEMA DE BASE DE DATOS PARA PETROASEO (SUPABASE)
-- ========================================================

-- 1. Tabla de Conductores
CREATE TABLE IF NOT EXISTS conductores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    codigo TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Registros Operativos (Segmentos de tiempo de las compactas)
CREATE TABLE IF NOT EXISTS registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    turno TEXT NOT NULL,
    supervisor TEXT NOT NULL,
    placa TEXT NOT NULL,
    conductor_id UUID REFERENCES conductores(id) ON DELETE CASCADE,
    fase TEXT NOT NULL, -- 'emmsa', 'viaje' o 'inoperativo'
    hora_inicio TEXT NOT NULL,
    hora_termino TEXT NOT NULL,
    n_guia TEXT DEFAULT 'G-DIARIA',
    observaciones TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Asistencia Diaria (Conductores que asistieron cada día)
CREATE TABLE IF NOT EXISTS asistencia (
    fecha DATE PRIMARY KEY,
    nombres TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Opcional: Desactivar políticas RLS para permitir acceso directo sin configurar autenticación (Modo Demostración/Prueba)
ALTER TABLE conductores DISABLE ROW LEVEL SECURITY;
ALTER TABLE registros DISABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia DISABLE ROW LEVEL SECURITY;
