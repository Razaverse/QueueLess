-- QueueLess performance indexes, 2026-11-06.
--
-- Run only after the companion preflight confirms that an equivalent index
-- does not already exist under another name. These statements are additive;
-- they neither modify rows nor alter tables. PostgreSQL prohibits CREATE INDEX
-- CONCURRENTLY inside a transaction, so execute this file with a client that
-- does not wrap the file in BEGIN/COMMIT (for example, psql).
--
-- IF NOT EXISTS prevents a failure on rerun only when the same index name
-- already exists. It does not detect an equivalent index with a different name.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Clinic_status_name_idx"
  ON public."Clinic" USING btree (status, name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "QueueEntry_clinicId_queueDate_doctorId_tokenNumber_idx"
  ON public."QueueEntry" USING btree ("clinicId", "queueDate", "doctorId", "tokenNumber");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "QueueEntry_patientId_queueDate_idx"
  ON public."QueueEntry" USING btree ("patientId", "queueDate");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "QueueEntry_patientId_doctorId_queueDate_status_idx"
  ON public."QueueEntry" USING btree ("patientId", "doctorId", "queueDate", status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Notification_userId_createdAt_idx"
  ON public."Notification" USING btree ("userId", "createdAt");
