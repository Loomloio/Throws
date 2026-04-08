-- Add detailed form tracking to horses
ALTER TABLE horses ADD COLUMN IF NOT EXISTS distance_record JSONB NOT NULL DEFAULT '{}';
-- Format: {"1000": {"starts": 5, "wins": 2, "places": 1}, "1200": {...}, ...}

ALTER TABLE horses ADD COLUMN IF NOT EXISTS ground_record JSONB NOT NULL DEFAULT '{}';
-- Format: {"firm": {"starts": 3, "wins": 1}, "good": {...}, ...}

ALTER TABLE horses ADD COLUMN IF NOT EXISTS speed_rating INT NOT NULL DEFAULT 70;
-- Normalised performance rating (60-120), updated after each race

ALTER TABLE horses ADD COLUMN IF NOT EXISTS avg_finish NUMERIC(4, 2) NOT NULL DEFAULT 4.5;
-- Average finishing position across career

ALTER TABLE horses ADD COLUMN IF NOT EXISTS days_since_last_race INT NOT NULL DEFAULT 0;
-- Days since last race (freshness indicator)

ALTER TABLE horses ADD COLUMN IF NOT EXISTS gate_record JSONB NOT NULL DEFAULT '{}';
-- Format: {"1": {"starts": 2, "wins": 1}, "2": {...}, ...}
