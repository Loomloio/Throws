-- Add place and show odds to race entries
ALTER TABLE race_entries ADD COLUMN IF NOT EXISTS place_odds NUMERIC(8, 2);
ALTER TABLE race_entries ADD COLUMN IF NOT EXISTS show_odds NUMERIC(8, 2);

-- Add bet_type to race_bets (win, place, show)
ALTER TABLE race_bets ADD COLUMN IF NOT EXISTS bet_type TEXT NOT NULL DEFAULT 'win';

-- Update settle_race to handle place and show bets
CREATE OR REPLACE FUNCTION settle_race(
  p_race_id UUID,
  p_winning_horse_id INT,
  p_server_seed TEXT
) RETURNS void AS $$
DECLARE
  bet RECORD;
  payout_amount NUMERIC;
  bet_result race_bet_status;
  horse_finish INT;
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
    -- Get this horse's finish position
    SELECT finish_position INTO horse_finish
    FROM race_entries
    WHERE race_id = p_race_id AND horse_id = bet.horse_id;

    -- Determine outcome based on bet type
    IF bet.bet_type = 'win' AND horse_finish = 1 THEN
      bet_result := 'won';
      payout_amount := bet.amount * bet.locked_odds;
    ELSIF bet.bet_type = 'place' AND horse_finish <= 2 THEN
      bet_result := 'won';
      payout_amount := bet.amount * bet.locked_odds;
    ELSIF bet.bet_type = 'show' AND horse_finish <= 3 THEN
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
        NULL::UUID,
        NULL::UUID
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
