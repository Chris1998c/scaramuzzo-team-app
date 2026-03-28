-- Abilitazione app mobile per collaboratore (come nelle altre route mobile).
ALTER TABLE staff
  ADD COLUMN mobile_enabled TINYINT(1) NOT NULL DEFAULT 1;
