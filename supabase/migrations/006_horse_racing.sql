-- ============================================
-- throws.gg Horse Racing — Database Schema
-- ============================================

-- Ground condition enum
CREATE TYPE ground_condition AS ENUM ('firm', 'good', 'soft', 'heavy');
CREATE TYPE race_status_type AS ENUM ('betting', 'closed', 'racing', 'settled');
CREATE TYPE race_bet_status AS ENUM ('pending', 'won', 'lost', 'cancelled');

-- ============================================
-- HORSES (16 persistent horses)
-- ============================================
CREATE TABLE horses (
  id              SERIAL PRIMARY KEY,
  name            TEXT UNIQUE NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  color           TEXT NOT NULL,

  -- Visible stats (1-100)
  speed           INT NOT NULL CHECK (speed BETWEEN 1 AND 100),
  stamina         INT NOT NULL CHECK (stamina BETWEEN 1 AND 100),
  form            INT NOT NULL CHECK (form BETWEEN 1 AND 100),
  consistency     INT NOT NULL CHECK (consistency BETWEEN 1 AND 100),
  ground_preference ground_condition NOT NULL DEFAULT 'good',

  -- Career stats
  career_races    INT NOT NULL DEFAULT 0,
  career_wins     INT NOT NULL DEFAULT 0,
  career_places   INT NOT NULL DEFAULT 0,   -- 2nd place finishes
  career_shows    INT NOT NULL DEFAULT 0,   -- 3rd place finishes
  last_5_results  JSONB NOT NULL DEFAULT '[]',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RACES
-- ============================================
CREATE TABLE races (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_number       BIGINT UNIQUE NOT NULL,
  status            race_status_type NOT NULL DEFAULT 'betting',
  distance          INT NOT NULL DEFAULT 1200,
  ground            ground_condition NOT NULL DEFAULT 'good',

  -- Provably fair
  server_seed       TEXT NOT NULL,
  server_seed_hash  TEXT NOT NULL,
  client_seed       TEXT NOT NULL DEFAULT 'throws.gg',
  nonce             BIGINT NOT NULL,

  -- Financials
  total_bet_amount  NUMERIC(18, 8) NOT NULL DEFAULT 0,
  total_payout      NUMERIC(18, 8) NOT NULL DEFAULT 0,
  house_profit      NUMERIC(18, 8) NOT NULL DEFAULT 0,
  bet_count         INT NOT NULL DEFAULT 0,

  -- Results
  winning_horse_id  INT REFERENCES horses(id),
  commentary        TEXT,

  -- Timing
  betting_opens_at  TIMESTAMPTZ NOT NULL,
  betting_closes_at TIMESTAMPTZ NOT NULL,
  race_starts_at    TIMESTAMPTZ,
  settled_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_races_status ON races(status);
CREATE INDEX idx_races_number ON races(race_number DESC);

-- ============================================
-- RACE ENTRIES (8 horses per race)
-- ============================================
CREATE TABLE race_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id         UUID NOT NULL REFERENCES races(id),
  horse_id        INT NOT NULL REFERENCES horses(id),
  gate_position   INT NOT NULL CHECK (gate_position BETWEEN 1 AND 8),

  -- Odds
  opening_odds    NUMERIC(8, 2) NOT NULL,
  current_odds    NUMERIC(8, 2) NOT NULL,
  true_probability NUMERIC(8, 6) NOT NULL,

  -- Post-race
  power_score     NUMERIC(10, 4),
  finish_position INT CHECK (finish_position BETWEEN 1 AND 8),
  margin          NUMERIC(6, 3),

  UNIQUE(race_id, horse_id),
  UNIQUE(race_id, gate_position)
);

CREATE INDEX idx_race_entries_race ON race_entries(race_id);

-- ============================================
-- RACE BETS
-- ============================================
CREATE TABLE race_bets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  race_id         UUID NOT NULL REFERENCES races(id),
  horse_id        INT NOT NULL REFERENCES horses(id),

  amount          NUMERIC(18, 8) NOT NULL CHECK (amount > 0),
  locked_odds     NUMERIC(8, 2) NOT NULL,
  potential_payout NUMERIC(18, 8) NOT NULL,
  payout          NUMERIC(18, 8),
  status          race_bet_status NOT NULL DEFAULT 'pending',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at      TIMESTAMPTZ
);

CREATE INDEX idx_race_bets_user ON race_bets(user_id, created_at DESC);
CREATE INDEX idx_race_bets_race ON race_bets(race_id);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Increment race bet totals
CREATE OR REPLACE FUNCTION increment_race_bets(
  p_race_id UUID,
  p_amount NUMERIC
) RETURNS void AS $$
BEGIN
  UPDATE races SET
    total_bet_amount = total_bet_amount + p_amount,
    bet_count = bet_count + 1
  WHERE id = p_race_id;
END;
$$ LANGUAGE plpgsql;

-- Settle all bets for a race
CREATE OR REPLACE FUNCTION settle_race(
  p_race_id UUID,
  p_winning_horse_id INT,
  p_server_seed TEXT
) RETURNS void AS $$
DECLARE
  bet RECORD;
  payout_amount NUMERIC;
  bet_result race_bet_status;
BEGIN
  -- Update race status
  UPDATE races SET
    status = 'settled',
    winning_horse_id = p_winning_horse_id,
    server_seed = p_server_seed,
    settled_at = NOW()
  WHERE id = p_race_id;

  -- Settle each bet
  FOR bet IN SELECT * FROM race_bets WHERE race_id = p_race_id AND status = 'pending' LOOP
    IF bet.horse_id = p_winning_horse_id THEN
      bet_result := 'won';
      payout_amount := bet.amount * bet.locked_odds;
    ELSE
      bet_result := 'lost';
      payout_amount := 0;
    END IF;

    -- Update bet
    UPDATE race_bets SET
      status = bet_result,
      payout = payout_amount,
      settled_at = NOW()
    WHERE id = bet.id;

    -- Credit winner
    IF payout_amount > 0 THEN
      PERFORM update_balance(
        bet.user_id,
        payout_amount,
        'payout'::tx_type,
        'USD'::TEXT,
        NULL::UUID,   -- no round_id (RPS specific)
        NULL::UUID    -- no bet_id (different table)
      );
    END IF;

    -- Update race totals
    UPDATE races SET
      total_payout = total_payout + payout_amount
    WHERE id = p_race_id;
  END LOOP;

  -- Calculate house profit
  UPDATE races SET
    house_profit = total_bet_amount - total_payout
  WHERE id = p_race_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED 16 HORSES
-- ============================================
INSERT INTO horses (name, slug, color, speed, stamina, form, consistency, ground_preference) VALUES
  ('Thunder Edge',  'thunder-edge',  '#8B5CF6', 88, 72, 75, 80, 'firm'),
  ('Iron Phantom',  'iron-phantom',  '#6366F1', 75, 85, 70, 85, 'good'),
  ('Crown Jewel',   'crown-jewel',   '#F59E0B', 82, 78, 80, 75, 'good'),
  ('Storm Protocol','storm-protocol','#3B82F6', 90, 65, 72, 60, 'firm'),
  ('Dark Reign',    'dark-reign',    '#1F2937', 70, 90, 68, 82, 'soft'),
  ('Silver Ghost',  'silver-ghost',  '#9CA3AF', 78, 80, 74, 78, 'good'),
  ('Night Fury',    'night-fury',    '#7C3AED', 85, 70, 76, 65, 'firm'),
  ('Volt Runner',   'volt-runner',   '#06B6D4', 92, 60, 70, 55, 'firm'),
  ('Rogue Wave',    'rogue-wave',    '#0EA5E9', 72, 88, 72, 80, 'heavy'),
  ('Dust Devil',    'dust-devil',    '#D97706', 80, 75, 65, 70, 'soft'),
  ('Shadow Mint',   'shadow-mint',   '#10B981', 76, 82, 78, 88, 'good'),
  ('Flash Crash',   'flash-crash',   '#EF4444', 88, 62, 60, 50, 'firm'),
  ('Paper Hands',   'paper-hands',   '#EC4899', 68, 85, 82, 90, 'soft'),
  ('Rug Pull',      'rug-pull',      '#F43F5E', 84, 68, 55, 45, 'good'),
  ('Dead Cat',      'dead-cat',      '#64748B', 74, 78, 85, 82, 'heavy'),
  ('Moon Shot',     'moon-shot',     '#FBBF24', 95, 55, 50, 40, 'firm');

-- Enable Realtime on races table
-- (Run separately in Supabase Dashboard: Database → Replication → enable races)
