# KineCheck application backup and restore drill

Updated: 2026-08-05

## Scope

The workflow `.github/workflows/backup-restore-drill.yml` creates a logical backup of the Supabase `public` schema, restores it into a temporary PostgreSQL 17 database, validates required tables and functions, encrypts the dump and retains the encrypted artifact for 7 days.

This validates the application data model, RLS configuration, functions and core records without modifying production.

## Required GitHub secrets

- `SUPABASE_DB_URL`: direct PostgreSQL connection string with permission to run `pg_dump`.
- `BACKUP_ENCRYPTION_PASSPHRASE`: long unique passphrase stored only as a repository secret and in the owner's password manager.

Never commit these values to the repository.

## Evidence of a successful drill

A successful run must contain:

1. A non-empty encrypted file `kinecheck-public.dump.enc`.
2. `SHA256SUMS.txt`.
3. `manifest.txt` with UTC date and source commit.
4. `restore-validation.txt` ending in `restore_validation_passed`.

## Restore procedure

1. Download the encrypted artifact before its seven-day retention period ends.
2. Decrypt locally:

   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
     -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
     -in kinecheck-public.dump.enc \
     -out kinecheck-public.dump
   ```

3. Verify the checksum against `SHA256SUMS.txt`.
4. Restore first into an isolated PostgreSQL 17 database with `pg_restore`.
5. Execute `scripts/validate_restore.sql`.
6. Restore to production only after written approval, a new production backup and confirmation that the target database is correct.

## Important limitations

This workflow backs up the application `public` schema. It does not replace Supabase managed backups or point-in-time recovery and does not export Auth passwords, provider-managed billing data or Storage objects. Full disaster recovery therefore also requires:

- confirmation of the Supabase managed-backup/PITR configuration;
- a Storage inventory and recovery procedure;
- controlled retention of protected course source files;
- periodic recovery testing with an isolated target.

## Frequency

- Automatic: every Sunday at 05:30 UTC.
- Manual: GitHub Actions → KineCheck Backup and Restore Drill → Run workflow.

The workflow intentionally fails when either required secret is absent. A failed run caused by a missing secret is not evidence of a completed backup.
