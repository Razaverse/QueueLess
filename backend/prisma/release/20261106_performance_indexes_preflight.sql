-- Read-only preflight for the QueueLess performance-index release.
-- Run this against Neon before applying 20261106_performance_indexes_apply.sql.
-- Do not include either file in a transaction when using CREATE INDEX CONCURRENTLY.

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Clinic', 'QueueEntry', 'Notification')
ORDER BY tablename, indexname;

-- Expected new indexes (compare the output by indexed columns, not name alone):
-- "Clinic_status_name_idx"                                  (status, name)
-- "QueueEntry_clinicId_queueDate_doctorId_tokenNumber_idx"  ("clinicId", "queueDate", "doctorId", "tokenNumber")
-- "QueueEntry_patientId_queueDate_idx"                      ("patientId", "queueDate")
-- "QueueEntry_patientId_doctorId_queueDate_status_idx"      ("patientId", "doctorId", "queueDate", status)
-- "Notification_userId_createdAt_idx"                       ("userId", "createdAt")
