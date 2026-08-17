-- Supabase Schema for Búsqueda Animal Cali
-- Compatible with Supavisor Port: 5432 (Transaction Mode)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Tabla Principal de Mascotas (Pets)
CREATE TABLE IF NOT EXISTS pets (
    id VARCHAR(50) PRIMARY KEY,
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('LOST', 'FOUND', 'SHELTERED', 'OBSERVED')),
    species VARCHAR(20) NOT NULL CHECK (species IN ('DOG', 'CAT', 'OTHER')),
    name VARCHAR(100) DEFAULT 'Sin nombre',
    gender VARCHAR(20) DEFAULT 'UNKNOWN' CHECK (gender IN ('MACHO', 'HEMBRA', 'UNKNOWN')),
    primary_color VARCHAR(100) NOT NULL,
    secondary_color VARCHAR(100) DEFAULT '',
    pattern VARCHAR(100) DEFAULT '',
    size VARCHAR(30) DEFAULT 'MEDIANO',
    distinctive_features TEXT DEFAULT '',
    neighborhood VARCHAR(150) NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    location GEOGRAPHY(Point, 4326),
    photo_url TEXT NOT NULL,
    embedding vector(768),
    raw_ai_features JSONB DEFAULT '{}',
    
    -- Información de Contacto
    contact_name VARCHAR(100) DEFAULT 'Anónimo',
    contact_phone TEXT DEFAULT '',
    source_url TEXT DEFAULT '',
    
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REUNITED', 'CLOSED')),
    ai_status VARCHAR(30) DEFAULT 'PROCESSED' CHECK (ai_status IN ('PENDING', 'PROCESSED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Índices de Alto Rendimiento
CREATE INDEX IF NOT EXISTS idx_pets_filter ON pets (species, report_type, status);
CREATE INDEX IF NOT EXISTS idx_pets_neighborhood ON pets (neighborhood);
CREATE INDEX IF NOT EXISTS idx_pets_status ON pets (status);
CREATE INDEX IF NOT EXISTS idx_pets_created ON pets (created_at DESC);

-- Trigger para sincronizar automáticamente el campo 'location' a partir de lat y lng
CREATE OR REPLACE FUNCTION update_pet_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_pet_location ON pets;
CREATE TRIGGER trg_update_pet_location
BEFORE INSERT OR UPDATE ON pets
FOR EACH ROW
EXECUTE FUNCTION update_pet_location();

-- Row Level Security (RLS)
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- Política 1: Lectura pública de mascotas activas
DROP POLICY IF EXISTS "Public can view active pets" ON pets;
CREATE POLICY "Public can view active pets"
ON pets FOR SELECT
USING (true);

-- Política 2: Inserción pública de nuevos reportes
DROP POLICY IF EXISTS "Public can insert new pet reports" ON pets;
CREATE POLICY "Public can insert new pet reports"
ON pets FOR INSERT
WITH CHECK (true);

-- Política 3: Actualización pública controlada (para cierre de casos)
DROP POLICY IF EXISTS "Public can update pet status" ON pets;
CREATE POLICY "Public can update pet status"
ON pets FOR UPDATE
USING (true);
