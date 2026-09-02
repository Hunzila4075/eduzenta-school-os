import pool from './db.js';
import bcrypt from 'bcrypt';

export async function initializeDatabase() {
  try {
    console.log('🔄 Initializing Eduzenta Database Schema & Seed Data...');
    const connection = await pool.getConnection();

    try {
      // ================================================================
      // SCHEMA VERSION GATE — run the DDL sweep only when the version bumps.
      // Previously ~22 DDL statements executed on EVERY boot (each one a WAN
      // round-trip), adding ~7s to every server start / Railway cold start.
      // ================================================================
      await connection.query(
        `CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
          \`version\` INT NOT NULL PRIMARY KEY,
          \`applied_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
      const [versionRows] = await connection.query('SELECT MAX(version) AS v FROM schema_migrations');
      const currentVersion = Number(versionRows[0]?.v || 0);
      const SCHEMA_VERSION = 4;

      // ================================================================
      // MIGRATION v1 — Core platform tables (schools, users, students,
      // attendance, broadcasts, classes + performance indexes)
      // ================================================================
      if (currentVersion < 1) {

      // 1. Create SCHOOLS table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`schools\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`name\` VARCHAR(255) NOT NULL,
          \`logo_url\` LONGTEXT DEFAULT NULL,
          \`status\` VARCHAR(50) DEFAULT 'Active',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Ensure logo_url column exists if table existed previously without it
      try {
        await connection.query(`
          ALTER TABLE \`schools\` ADD COLUMN \`logo_url\` LONGTEXT DEFAULT NULL AFTER \`name\`;
        `);
      } catch (err) {
        // Ignore if column already exists
      }

      // Ensure status column allows flexible status strings
      try {
        await connection.query(`
          ALTER TABLE \`schools\` MODIFY COLUMN \`status\` VARCHAR(50) DEFAULT 'Active';
        `);
      } catch (err) {
        // Ignore if alter fails
      }

      // 2. Create USERS table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`users\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`school_id\` INT DEFAULT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          \`email\` VARCHAR(255) NOT NULL UNIQUE,
          \`password\` VARCHAR(255) NOT NULL,
          \`role\` ENUM('super_admin', 'admin', 'teacher', 'student', 'parent') NOT NULL DEFAULT 'admin',
          \`is_active\` TINYINT(1) DEFAULT 1,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_school_id\` (\`school_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Ensure school_id column exists if table existed previously without it
      try {
        await connection.query(`
          ALTER TABLE \`users\` ADD COLUMN \`school_id\` INT DEFAULT NULL AFTER \`id\`;
        `);
      } catch (err) {
        // Column already exists, ignore
      }

      // Ensure updated_at column exists if table existed previously without it
      try {
        await connection.query(`
          ALTER TABLE \`users\` ADD COLUMN \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
        `);
      } catch (err) {
        // Column already exists, ignore
      }

      // Ensure avatar_url column exists for profile pictures
      try {
        await connection.query(`
          ALTER TABLE \`users\` ADD COLUMN \`avatar_url\` LONGTEXT DEFAULT NULL;
        `);
      } catch (err) {
        // Column already exists, ignore
      }

      // Ensure profile detail columns exist (phone, dob, designation, social_links)
      // — declared in schema.sql but missing from pre-existing installations.
      const profileCols = [
        ['phone', 'VARCHAR(32) DEFAULT NULL'],
        ['dob', 'DATE DEFAULT NULL'],
        ['designation', 'VARCHAR(120) DEFAULT NULL'],
        ['social_links', 'TEXT DEFAULT NULL']
      ];
      for (const [col, def] of profileCols) {
        try {
          await connection.query(`ALTER TABLE \`users\` ADD COLUMN \`${col}\` ${def};`);
        } catch (err) {
          // Column already exists, ignore
        }
      }

      // 3. Create CLASSES table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`classes\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`school_id\` INT DEFAULT NULL,
          \`class_name\` VARCHAR(50) NOT NULL,
          \`section\` VARCHAR(10) NOT NULL,
          \`teacher_id\` VARCHAR(50) DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY \`uk_class_section\` (\`class_name\`, \`section\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 4. Create STUDENTS table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`students\` (
          \`id\` VARCHAR(50) PRIMARY KEY,
          \`school_id\` INT DEFAULT NULL,
          \`roll_number\` VARCHAR(50) NOT NULL,
          \`reg_no\` VARCHAR(50) DEFAULT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          \`class_id\` INT DEFAULT NULL,
          \`class_section\` VARCHAR(50) DEFAULT NULL,
          \`gender\` ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
          \`phone\` VARCHAR(50) DEFAULT NULL,
          \`guardian_name\` VARCHAR(255) DEFAULT NULL,
          \`photo_url\` TEXT DEFAULT NULL,
          \`status\` ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_class_section\` (\`class_section\`),
          INDEX \`idx_roll_number\` (\`roll_number\`),
          INDEX \`idx_status\` (\`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 5. Create ATTENDANCE table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`attendance\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`school_id\` INT DEFAULT NULL,
          \`student_id\` VARCHAR(50) NOT NULL,
          \`class_section\` VARCHAR(50) NOT NULL,
          \`date\` DATE NOT NULL,
          \`status\` ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL DEFAULT 'Present',
          \`marked_by\` VARCHAR(255) DEFAULT 'Teacher',
          \`is_locked\` TINYINT(1) NOT NULL DEFAULT 0,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY \`uk_student_date\` (\`student_id\`, \`date\`),
          INDEX \`idx_attendance_date_class\` (\`date\`, \`class_section\`),
          INDEX \`idx_student_id\` (\`student_id\`),
          FOREIGN KEY (\`student_id\`) REFERENCES \`students\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 6. Create BROADCASTS table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`broadcasts\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`title\` VARCHAR(255) NOT NULL,
          \`description\` TEXT NOT NULL,
          \`message\` TEXT DEFAULT NULL,
          \`image_url\` TEXT DEFAULT NULL,
          \`video_url\` TEXT DEFAULT NULL,
          \`target_school_id\` VARCHAR(50) DEFAULT 'all',
          \`sender\` VARCHAR(255) NOT NULL DEFAULT 'Super Admin',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_target_school\` (\`target_school_id\`),
          INDEX \`idx_created_at\` (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Ensure message column exists if table existed previously without it
      try {
        await connection.query(`
          ALTER TABLE \`broadcasts\` ADD COLUMN \`message\` TEXT DEFAULT NULL AFTER \`description\`;
        `);
      } catch (err) {
        // Column already exists, ignore
      }

      // Attendance teacher-lock column — required for databases created before
      // the lock system existed (idempotent: skipped when the column is present).
      try {
        await connection.query('ALTER TABLE `attendance` ADD COLUMN `is_locked` TINYINT(1) NOT NULL DEFAULT 0');
      } catch (_) { /* column already exists */ }

      // ================================================================
      // PERFORMANCE INDEXES — Add missing indexes on live databases
      // Each ALTER TABLE is wrapped in try/catch so it's idempotent
      // (safe to run on startup even if index already exists)
      // ================================================================

      // users(role) — speeds up filtering teachers vs admins
      try {
        await connection.query(`ALTER TABLE \`users\` ADD INDEX \`idx_role\` (\`role\`)`);
      } catch (_) { /* already exists */ }

      // users(school_id, role) composite — fast scoped role queries
      try {
        await connection.query(`ALTER TABLE \`users\` ADD INDEX \`idx_school_role\` (\`school_id\`, \`role\`)`);
      } catch (_) { /* already exists */ }

      // users(is_active) — speeds up active user filtering
      try {
        await connection.query(`ALTER TABLE \`users\` ADD INDEX \`idx_is_active\` (\`is_active\`)`);
      } catch (_) { /* already exists */ }

      // students(school_id) — CRITICAL: scopes student queries to school
      try {
        await connection.query(`ALTER TABLE \`students\` ADD INDEX \`idx_school_id\` (\`school_id\`)`);
      } catch (_) { /* already exists */ }

      // students(school_id, class_section) composite — fast class roster queries
      try {
        await connection.query(`ALTER TABLE \`students\` ADD INDEX \`idx_school_class\` (\`school_id\`, \`class_section\`)`);
      } catch (_) { /* already exists */ }

      // attendance(school_id) — scopes attendance to school
      try {
        await connection.query(`ALTER TABLE \`attendance\` ADD INDEX \`idx_school_id\` (\`school_id\`)`);
      } catch (_) { /* already exists */ }

      // attendance(school_id, date, class_section) — fast class+date queries
      try {
        await connection.query(`ALTER TABLE \`attendance\` ADD INDEX \`idx_school_date_class\` (\`school_id\`, \`date\`, \`class_section\`)`);
      } catch (_) { /* already exists */ }

      console.log('📦 Database schema migrated to version 1 (core tables).');
      }

      // ================================================================
      // MIGRATION v2 — Teacher↔Class assignments (single source of truth
      // for teacher class visibility), per-school class catalog, and real
      // persistence for marks / fee challans / admit cards.
      // ================================================================
      if (currentVersion < 2) {

      // 1. teacher_class_assignments — many-to-many. EVERY teacher-scoped
      //    query in the API validates against this table (403 otherwise).
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`teacher_class_assignments\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`school_id\` INT DEFAULT NULL,
          \`teacher_user_id\` INT NOT NULL,
          \`class_section\` VARCHAR(50) NOT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY \`uk_teacher_class\` (\`teacher_user_id\`, \`class_section\`),
          INDEX \`idx_tca_school\` (\`school_id\`),
          INDEX \`idx_tca_class\` (\`school_id\`, \`class_section\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 2. users.assigned_subjects — persist teacher subject allocation
      try {
        await connection.query('ALTER TABLE `users` ADD COLUMN `assigned_subjects` TEXT DEFAULT NULL');
      } catch (_) { /* column already exists */ }

      // 3-6. users profile detail columns — persist phone/dob/designation/social links
      try {
        await connection.query('ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(32) DEFAULT NULL');
      } catch (_) { /* column already exists */ }
      try {
        await connection.query('ALTER TABLE `users` ADD COLUMN `dob` DATE DEFAULT NULL');
      } catch (_) { /* column already exists */ }
      try {
        await connection.query('ALTER TABLE `users` ADD COLUMN `designation` VARCHAR(120) DEFAULT NULL');
      } catch (_) { /* column already exists */ }
      try {
        await connection.query('ALTER TABLE `users` ADD COLUMN `social_links` TEXT DEFAULT NULL');
      } catch (_) { /* column already exists */ }

      // 3. Class catalog — v1 key (class_name, section) was NOT school-scoped
      //    (cross-tenant collision). Replace with a school-scoped key.
      try {
        await connection.query('ALTER TABLE `classes` DROP INDEX `uk_class_section`');
      } catch (_) { /* already replaced */ }
      try {
        await connection.query('ALTER TABLE `classes` ADD UNIQUE KEY `uk_school_class` (`school_id`, `class_name`, `section`)');
      } catch (_) { /* already exists */ }
      try {
        await connection.query('ALTER TABLE `classes` ADD INDEX `idx_classes_school` (`school_id`)');
      } catch (_) { /* already exists */ }

      // Safe backfill: seed each school's catalog from its REAL enrolled
      // classes (parsed from live students.class_section). No fabricated rows.
      try {
        await connection.query(`
          INSERT IGNORE INTO \`classes\` (\`school_id\`, \`class_name\`, \`section\`)
          SELECT DISTINCT s.school_id,
                 TRIM(SUBSTRING_INDEX(s.class_section, '-', 1)),
                 CASE
                   WHEN TRIM(s.class_section) LIKE '%-%'
                        AND TRIM(SUBSTRING_INDEX(s.class_section, '-', -1)) <> TRIM(SUBSTRING_INDEX(s.class_section, '-', 1))
                   THEN TRIM(SUBSTRING_INDEX(s.class_section, '-', -1))
                   ELSE ''
                 END
          FROM \`students\` s
          WHERE s.class_section IS NOT NULL AND s.class_section <> '' AND s.school_id IS NOT NULL
        `);
      } catch (_) { /* backfill is best-effort */ }

      // 4. marks — real persistence for marks entry & result cards
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`marks\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`school_id\` INT DEFAULT NULL,
          \`student_id\` VARCHAR(50) NOT NULL,
          \`class_section\` VARCHAR(50) DEFAULT NULL,
          \`term\` VARCHAR(50) NOT NULL DEFAULT '1st Term',
          \`subject\` VARCHAR(100) NOT NULL,
          \`max_marks\` INT NOT NULL DEFAULT 100,
          \`obtained_marks\` DECIMAL(6,2) NOT NULL DEFAULT 0,
          \`remarks\` VARCHAR(255) DEFAULT NULL,
          \`teacher_remarks\` TEXT DEFAULT NULL,
          \`marked_by\` VARCHAR(255) DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY \`uk_mark\` (\`student_id\`, \`term\`, \`subject\`),
          INDEX \`idx_marks_school_class\` (\`school_id\`, \`class_section\`, \`term\`),
          INDEX \`idx_marks_student\` (\`student_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 5. fee_challans — real persistence for the challan engine
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`fee_challans\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`school_id\` INT DEFAULT NULL,
          \`student_id\` VARCHAR(50) NOT NULL,
          \`class_section\` VARCHAR(50) DEFAULT NULL,
          \`term\` VARCHAR(50) DEFAULT '1st Term',
          \`month_year\` VARCHAR(50) NOT NULL,
          \`session\` VARCHAR(50) DEFAULT NULL,
          \`tuition_fee\` DECIMAL(10,2) DEFAULT 0,
          \`development_fee\` DECIMAL(10,2) DEFAULT 0,
          \`exam_fee\` DECIMAL(10,2) DEFAULT 0,
          \`library_fee\` DECIMAL(10,2) DEFAULT 0,
          \`computer_fee\` DECIMAL(10,2) DEFAULT 0,
          \`activity_fee\` DECIMAL(10,2) DEFAULT 0,
          \`prev_balance\` DECIMAL(10,2) DEFAULT 0,
          \`late_fee\` DECIMAL(10,2) DEFAULT 0,
          \`discounts\` DECIMAL(10,2) DEFAULT 0,
          \`total_amount\` DECIMAL(10,2) DEFAULT 0,
          \`status\` VARCHAR(20) DEFAULT 'Unpaid',
          \`due_date\` VARCHAR(30) DEFAULT NULL,
          \`chalan_no\` VARCHAR(60) DEFAULT NULL,
          \`created_by\` VARCHAR(255) DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY \`uk_challan\` (\`school_id\`, \`student_id\`, \`month_year\`, \`term\`),
          INDEX \`idx_challan_school_class\` (\`school_id\`, \`class_section\`),
          INDEX \`idx_challan_student\` (\`student_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 7. SUPER ADMIN SEED — ONLY CREATE IF NOT EXISTS (DO NOT OVERWRITE ON RESTART)
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'developerwithkhan804@gmail.com';
      // SECURITY — no weak default password. Seeding a fresh Super Admin now
      // REQUIRES a strong SUPER_ADMIN_PASSWORD from the environment; the old
      // 'admin123' fallback would create a publicly-known super admin account
      // on any fresh database. Existing deployments are unaffected because the
      // seed is skipped entirely once the account exists.
      const rawSeedPassword = process.env.SUPER_ADMIN_PASSWORD;

      const [existingUser] = await connection.query(
        'SELECT id, email, role FROM users WHERE email = ?',
        [superAdminEmail]
      );

      if (!existingUser || existingUser.length === 0) {
        if (!rawSeedPassword || String(rawSeedPassword).length < 8) {
          throw new Error('SUPER_ADMIN_PASSWORD environment variable (min 8 chars) must be set before the Super Admin account can be seeded.');
        }
        const hashedPassword = await bcrypt.hash(rawSeedPassword, 10);
        await connection.query(
          `INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (NULL, ?, ?, ?, 'super_admin', 1)`,
          ['Eduzenta Super Admin', superAdminEmail, hashedPassword]
        );
        console.log(`✅ Super Admin Account Seeded: ${superAdminEmail}`);
      } else {
        // Verify role/status WITHOUT re-hashing the password — the old behaviour
        // silently reset the Super Admin password on every deploy/restart and
        // burned ~300ms of event-loop hashing on every boot.
        await connection.query(
          'UPDATE users SET role = "super_admin", is_active = 1 WHERE email = ?',
          [superAdminEmail]
        );
        console.log(`ℹ️ Super Admin Account Verified in Database: ${superAdminEmail} (password left unchanged)`);
      }

      // 6. admit_cards — real persistence for hall tickets
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`admit_cards\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`school_id\` INT DEFAULT NULL,
          \`student_id\` VARCHAR(50) NOT NULL,
          \`class_section\` VARCHAR(50) DEFAULT NULL,
          \`term\` VARCHAR(50) DEFAULT '1st Term',
          \`exam_center\` VARCHAR(255) DEFAULT NULL,
          \`status\` VARCHAR(20) DEFAULT 'Active',
          \`created_by\` VARCHAR(255) DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY \`uk_admit\` (\`school_id\`, \`student_id\`, \`term\`),
          INDEX \`idx_admit_school_class\` (\`school_id\`, \`class_section\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      console.log('📦 Database schema migrated to version 2 (teacher-class isolation + academic tables).');
      }

      // ================================================================
      // MIGRATION v3 — Teacher attendance lock (server-side enforcement).
      // Adds a single is_locked flag to the EXISTING attendance table so once a
      // teacher submits a class+date register it becomes read-only for teachers.
      // Admins keep full override via the existing attendance APIs (is_locked is
      // simply preserved on admin writes — never silently cleared).
      // ================================================================
      if (currentVersion < 3) {
        try {
          await connection.query(
            'ALTER TABLE `attendance` ADD COLUMN `is_locked` TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`'
          );
        } catch (err) {
          // Column already exists, ignore
        }
        console.log('📦 Database schema migrated to version 3 (teacher attendance lock).');
      }

      // ================================================================
      // MIGRATION v4 — Activities (class assessments) real persistence.
      // Previously activities lived ONLY in React state: no table, no API,
      // no fetch — so every activity vanished on refresh / re-login. This
      // table is the single persistence source consumed by /api/activities.
      // ================================================================
      if (currentVersion < 4) {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS \`activities\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`school_id\` INT DEFAULT NULL,
            \`teacher_user_id\` INT DEFAULT NULL,
            \`name\` VARCHAR(255) NOT NULL,
            \`subject\` VARCHAR(120) NOT NULL,
            \`max_marks\` INT DEFAULT 100,
            \`term\` VARCHAR(50) DEFAULT '1st Term',
            \`class_section\` VARCHAR(50) NOT NULL,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX \`idx_activities_school\` (\`school_id\`),
            INDEX \`idx_activities_school_class\` (\`school_id\`, \`class_section\`),
            INDEX \`idx_activities_teacher\` (\`teacher_user_id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('📦 Database schema migrated to version 4 (activities persistence).');
      }

      await connection.query(
        'INSERT INTO schema_migrations (version) VALUES (?) ON DUPLICATE KEY UPDATE version = VALUES(version)',
        [SCHEMA_VERSION]
      );
      console.log(`✅ Schema version confirmed: ${SCHEMA_VERSION}.`);

      // ================================================================
      // ALWAYS-RUN CATALOG SYNC — manual teacher class assignments are
      // free-form (the admin types any class name, e.g. "Class 9-A").
      // Ensure every assigned class also exists in the school's classes
      // catalog so enrollment, roster filtering and class dropdowns accept
      // it. Idempotent (INSERT IGNORE), one query per boot, and mirrors the
      // same parse rules used by classExistsInCatalog.
      // ================================================================
      try {
        const [catResult] = await connection.query(`
          INSERT IGNORE INTO \`classes\` (\`school_id\`, \`class_name\`, \`section\`)
          SELECT DISTINCT tca.school_id,
                 TRIM(SUBSTRING_INDEX(tca.class_section, '-', 1)),
                 CASE
                   WHEN TRIM(tca.class_section) LIKE '%-%'
                        AND TRIM(SUBSTRING_INDEX(tca.class_section, '-', -1)) <> TRIM(SUBSTRING_INDEX(tca.class_section, '-', 1))
                   THEN TRIM(SUBSTRING_INDEX(tca.class_section, '-', -1))
                   ELSE ''
                 END
          FROM \`teacher_class_assignments\` tca
          WHERE tca.class_section IS NOT NULL AND tca.class_section <> '' AND tca.school_id IS NOT NULL
        `);
        if (catResult && catResult.affectedRows > 0) {
          console.log(`📚 Synced ${catResult.affectedRows} manually-assigned class(es) into the class catalog.`);
        }
      } catch (_) { /* catalog sync is best-effort */ }

    } finally {
      connection.release();
    }
    console.log('✅ Database Schema Auto-Migration & Persistence Check Completed Successfully.');
  } catch (error) {
    console.error('❌ Database Initialization Failed:', error.message);
  }
}
