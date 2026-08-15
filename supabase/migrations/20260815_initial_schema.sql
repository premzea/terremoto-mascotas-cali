-- Supabase Schema for Red de Rescate y Reencuentro de Mascotas (Cali Earthquake)
-- Supavisor Port: 5432 (Transaction Mode)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";
-- CREATE EXTENSION IF NOT EXISTS "pg_cron"; -- Enabled via Supabase Dashboard if on cloud

-- 1. Tabla de Barrios de Cali y Centroides (para fallback sin EXIF GPS)
CREATE TABLE IF NOT EXISTS cali_barrios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    comuna VARCHAR(50),
    centroid GEOGRAPHY(Point, 4326) NOT NULL
);

-- 2. Tabla Principal de Mascotas
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('LOST', 'FOUND', 'SHELTERED', 'OBSERVED')),
    species VARCHAR(20) NOT NULL CHECK (species IN ('DOG', 'CAT', 'OTHER')),
    name VARCHAR(100),
    gender VARCHAR(20) DEFAULT 'UNKNOWN' CHECK (gender IN ('MACHO', 'HEMBRA', 'UNKNOWN')),
    primary_color VARCHAR(50) NOT NULL,
    secondary_color VARCHAR(50),
    pattern VARCHAR(50), -- 'Manchas', 'Rayas', 'Solido', etc.
    size VARCHAR(30) DEFAULT 'MEDIANO',
    distinctive_features TEXT,
    neighborhood VARCHAR(100) NOT NULL,
    location GEOGRAPHY(Point, 4326),
    photo_url TEXT NOT NULL,
    embedding vector(768),
    raw_ai_features JSONB DEFAULT '{}',
    
    -- Información de Contacto / Triaje Mediado (Protegido contra Extorsión)
    contact_name VARCHAR(100) NOT NULL,
    contact_phone_encrypted TEXT NOT NULL,
    source_url TEXT,
    
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REUNITED', 'CLOSED')),
    ai_status VARCHAR(30) DEFAULT 'PENDING' CHECK (ai_status IN ('PENDING', 'PROCESSED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices Espaciales y de Búsqueda
CREATE INDEX IF NOT EXISTS idx_pets_filter ON pets (species, report_type, status);
CREATE INDEX IF NOT EXISTS idx_pets_neighborhood ON pets (neighborhood);
CREATE INDEX IF NOT EXISTS idx_pets_location ON pets USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_pets_ai_pending ON pets (ai_status) WHERE ai_status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_pets_created ON pets (created_at DESC);

-- Función de búsqueda espacial por proximidad
CREATE OR REPLACE FUNCTION search_nearby_pets(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 10000,
    filter_species VARCHAR DEFAULT NULL,
    filter_report_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    report_type VARCHAR,
    species VARCHAR,
    name VARCHAR,
    gender VARCHAR,
    primary_color VARCHAR,
    secondary_color VARCHAR,
    distinctive_features TEXT,
    neighborhood VARCHAR,
    photo_url TEXT,
    distance_meters DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        p.id,
        p.report_type,
        p.species,
        p.name,
        p.gender,
        p.primary_color,
        p.secondary_color,
        p.distinctive_features,
        p.neighborhood,
        p.photo_url,
        ST_Distance(p.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) AS distance_meters,
        p.created_at
    FROM pets p
    WHERE 
        (filter_species IS NULL OR p.species = filter_species)
        AND (filter_report_type IS NULL OR p.report_type = filter_report_type)
        AND p.status = 'ACTIVE'
        AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_meters)
    ORDER BY distance_meters ASC, p.created_at DESC;
$$;
