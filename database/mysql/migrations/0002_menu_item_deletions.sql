ALTER TABLE menu_overrides
  ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER available;
