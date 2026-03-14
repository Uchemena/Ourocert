# Migration File Renumbering Guide

## Issue: Duplicate Migration Numbers

During the security audit, we discovered duplicate migration file numbers in the `supabase/migrations/` directory. This can cause confusion during database setup as the order of execution may be unpredictable.

---

## Current Migration Files

```
001_profiles.sql                          ✅ OK
002_batches.sql                           ✅ OK
003_templates.sql                         ✅ OK
004_add_fields_to_templates.sql           ✅ OK
005_add_brand_to_templates.sql            ✅ OK
006_add_subscription_to_profiles.sql      ⚠️ DUPLICATE 006
006_certificates.sql                      ⚠️ DUPLICATE 006
007_add_email_defaults_and_logo.sql       ⚠️ DUPLICATE 007
007_add_email_to_batches.sql              ⚠️ DUPLICATE 007
008_storage_generated_certificates.sql    ✅ OK
```

---

## Recommended Renumbering

### Option 1: Sequential Renumbering (Recommended)

Renumber all migrations to be sequential based on their creation order:

```
001_profiles.sql                          → Keep
002_batches.sql                           → Keep
003_templates.sql                         → Keep
004_add_fields_to_templates.sql           → Keep
005_add_brand_to_templates.sql            → Keep
006_certificates.sql                      → Keep
007_add_subscription_to_profiles.sql      → Rename (was 006)
008_storage_generated_certificates.sql    → Rename (was 008)
009_add_email_to_batches.sql              → Rename (was 007)
010_add_email_defaults_and_logo.sql       → Rename (was 007)
```

**Justification for this order:**
1. `006_certificates.sql` - Creates certificates table (depends on batches)
2. `007_add_subscription_to_profiles.sql` - Adds subscription fields to existing profiles table
3. `008_storage_generated_certificates.sql` - Creates storage bucket for certificates (logical after table creation)
4. `009_add_email_to_batches.sql` - Adds email fields to batches table
5. `010_add_email_defaults_and_logo.sql` - Adds email defaults to profiles (Session 11)

---

## Step-by-Step Renaming Process

### If Database Already Migrated (Production/Staging)
**⚠️ CAUTION:** If you've already run these migrations in any environment, **DO NOT** rename files unless you track which migrations have been executed.

**Safe Approach:**
1. Check which migrations have been run: `SELECT * FROM schema_migrations` (if your system tracks this)
2. Only rename migrations that haven't been executed yet
3. Update your migration tracking system if necessary

### If Database NOT Yet Migrated (Fresh Setup)
This is the easiest scenario. Simply rename the files:

#### On Windows PowerShell:
```powershell
cd c:\Users\richi\OneDrive\Laureate\supabase\migrations

# Rename duplicates
Rename-Item "006_add_subscription_to_profiles.sql" "007_add_subscription_to_profiles.sql"
Rename-Item "008_storage_generated_certificates.sql" "008_storage_generated_certificates.sql"  # Keep as is
Rename-Item "007_add_email_to_batches.sql" "009_add_email_to_batches.sql"
Rename-Item "007_add_email_defaults_and_logo.sql" "010_add_email_defaults_and_logo.sql"
```

#### On macOS/Linux:
```bash
cd ~/path/to/laureate/supabase/migrations

# Rename duplicates
mv 006_add_subscription_to_profiles.sql 007_add_subscription_to_profiles.sql
mv 008_storage_generated_certificates.sql 008_storage_generated_certificates.sql  # Keep as is
mv 007_add_email_to_batches.sql 009_add_email_to_batches.sql
mv 007_add_email_defaults_and_logo.sql 010_add_email_defaults_and_logo.sql
```

---

## After Renaming: Update Documentation

### 1. Update SUPABASE_SETUP.md

Find Step 3 (Run Database Migrations) and update the migration list:

**Before:**
```markdown
1. `001_profiles.sql` - User profiles
2. `002_batches.sql` - Certificate batches
3. `003_templates.sql` - Certificate templates
4. `004_add_fields_to_templates.sql` - Template fields
5. `005_add_brand_to_templates.sql` - Branding support
6. `006_certificates.sql` - Certificates table
7. `006_add_subscription_to_profiles.sql` - Stripe subscriptions  ⚠️
8. `007_add_email_to_batches.sql` - Email tracking  ⚠️
9. `007_add_email_defaults_and_logo.sql` - Email defaults  ⚠️
10. `008_storage_generated_certificates.sql` - Certificate storage
```

**After:**
```markdown
1. `001_profiles.sql` - User profiles
2. `002_batches.sql` - Certificate batches
3. `003_templates.sql` - Certificate templates
4. `004_add_fields_to_templates.sql` - Template fields
5. `005_add_brand_to_templates.sql` - Branding support
6. `006_certificates.sql` - Certificates table
7. `007_add_subscription_to_profiles.sql` - Stripe subscriptions
8. `008_storage_generated_certificates.sql` - Certificate storage
9. `009_add_email_to_batches.sql` - Email tracking
10. `010_add_email_defaults_and_logo.sql` - Email defaults (Session 11)
```

### 2. Update Session Documentation (if applicable)

If you have session documentation files mentioning migration numbers, update those as well:
- `SESSION_10_STRIPE_COMPLETE.md` - References migration 006 (subscription)
- `SESSION_11_SETTINGS_COMPLETE.md` - References migration 007 (email defaults)

Search for migration references:
```powershell
# Windows PowerShell
Get-ChildItem -Path . -Filter "SESSION_*.md" | Select-String "006_add_subscription" -List
Get-ChildItem -Path . -Filter "SESSION_*.md" | Select-String "007_add_email" -List
```

---

## Verification After Renaming

### 1. Check File Order
```powershell
# Windows PowerShell
Get-ChildItem "supabase\migrations\*.sql" | Sort-Object Name | Select-Object Name
```

**Expected Output:**
```
001_profiles.sql
002_batches.sql
003_templates.sql
004_add_fields_to_templates.sql
005_add_brand_to_templates.sql
006_certificates.sql
007_add_subscription_to_profiles.sql
008_storage_generated_certificates.sql
009_add_email_to_batches.sql
010_add_email_defaults_and_logo.sql
```

### 2. Test Fresh Database Setup

Create a test Supabase project and run all migrations in order:

```sql
-- Run in Supabase SQL Editor
-- Execute each migration file in sequence

-- After running all migrations, verify tables exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- batches, certificates, profiles, templates
```

### 3. Verify RLS Policies

```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- All should show: rowsecurity = true
```

---

## Why This Matters

### Security Implications
- **None directly** - This is a structural/organizational issue, not a security vulnerability
- No impact on Row Level Security policies
- No impact on authentication or authorization

### Operational Implications
- **Database setup confusion** - Developers may skip migrations or run them out of order
- **Deployment issues** - Automated migration tools may fail with duplicate numbers
- **Documentation accuracy** - Setup guides become confusing with duplicate references
- **Team collaboration** - Other developers won't know which migration ran when

---

## Prevention for Future Sessions

To avoid this in the future:

1. **Always check existing migrations** before creating new ones:
   ```powershell
   Get-ChildItem "supabase\migrations\*.sql" | Sort-Object Name | Select-Object -Last 1
   ```

2. **Use sequential numbering** - Next migration should be one higher than the last

3. **Follow naming convention**:
   ```
   [NUMBER]_[descriptive_name].sql
   
   Examples:
   011_add_analytics_table.sql
   012_add_team_collaboration.sql
   013_add_bulk_import_feature.sql
   ```

4. **Document new migrations immediately** in SUPABASE_SETUP.md

---

## Summary

**Current Status:** 2 pairs of duplicate migration numbers (006 x2, 007 x2)

**Recommended Action:** Renumber to sequential 001-010

**Priority:** Medium - Should fix before production, not a security issue

**Impact:** Improves setup clarity and prevents deployment issues

**Next Steps:**
1. Decide: Rename now or defer until pre-production?
2. If renaming: Follow step-by-step process above
3. Update SUPABASE_SETUP.md with corrected numbers
4. Verify with fresh database test
5. Commit changes with clear message: "fix: renumber duplicate migration files to sequential order"

---

**Document Created:** January 2025  
**Related:** SECURITY_AUDIT_REPORT.md (Section 8: Code Quality & Maintenance)