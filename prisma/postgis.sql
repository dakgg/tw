CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "operating_areas" ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("longitude"::double precision, "latitude"::double precision), 4326)::geography) STORED;
CREATE INDEX IF NOT EXISTS "operating_areas_location_gix" ON "operating_areas" USING GIST ("location");
