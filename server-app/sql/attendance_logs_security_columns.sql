-- Eseguire una volta sul DB prima di usare insert con metadati sicurezza.
ALTER TABLE attendance_logs
  ADD COLUMN user_lat DECIMAL(10, 7) NULL,
  ADD COLUMN user_lng DECIMAL(10, 7) NULL,
  ADD COLUMN accuracy_m DECIMAL(10, 2) NULL,
  ADD COLUMN is_mocked TINYINT(1) NULL DEFAULT 0,
  ADD COLUMN distance_from_salon_m DECIMAL(12, 2) NULL,
  ADD COLUMN is_suspicious TINYINT(1) NULL DEFAULT 0;
