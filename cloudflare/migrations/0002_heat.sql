ALTER TABLE users ADD COLUMN statistics_enabled INTEGER NOT NULL DEFAULT 1 CHECK (statistics_enabled IN (0, 1));
ALTER TABLE users ADD COLUMN statistics_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sync_state ADD COLUMN heat_contribution TEXT NOT NULL DEFAULT '{}';
ALTER TABLE sync_state ADD COLUMN heat_index TEXT NOT NULL DEFAULT '';
CREATE INDEX sync_heat_index ON sync_state(heat_index);
CREATE TABLE heat_scores (target TEXT PRIMARY KEY, weight REAL NOT NULL) WITHOUT ROWID;
CREATE TABLE heat_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT,
  expires_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0
);
INSERT INTO heat_cache (id) VALUES (1);

-- Account projections and aggregate deltas commit in the same transaction.
-- Group the old/new vectors once instead of rewriting every unchanged score.
CREATE TRIGGER heat_update AFTER UPDATE OF heat_contribution ON sync_state
WHEN OLD.heat_contribution != NEW.heat_contribution
BEGIN
  INSERT INTO heat_scores(target, weight)
    SELECT key, SUM(delta) FROM (
      SELECT key, value AS delta FROM json_each(NEW.heat_contribution)
      UNION ALL SELECT key, -value FROM json_each(OLD.heat_contribution)
    ) GROUP BY key HAVING SUM(delta) != 0
    ON CONFLICT(target) DO UPDATE SET weight = weight + excluded.weight;
  DELETE FROM heat_scores WHERE target IN (SELECT key FROM json_each(OLD.heat_contribution))
    AND ABS(weight) < 0.000000001;
END;
CREATE TRIGGER heat_insert AFTER INSERT ON sync_state
BEGIN
  INSERT INTO heat_scores(target, weight)
    SELECT key, value FROM json_each(NEW.heat_contribution) WHERE value != 0
    ON CONFLICT(target) DO UPDATE SET weight = weight + excluded.weight;
END;
CREATE TRIGGER heat_delete AFTER DELETE ON sync_state
BEGIN
  UPDATE heat_scores SET weight = weight - COALESCE((SELECT value FROM json_each(OLD.heat_contribution) WHERE key = target), 0)
    WHERE target IN (SELECT key FROM json_each(OLD.heat_contribution));
  DELETE FROM heat_scores WHERE target IN (SELECT key FROM json_each(OLD.heat_contribution)) AND ABS(weight) < 0.000000001;
END;
