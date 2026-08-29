import pool from './db.js';
import bcrypt from 'bcryptjs';

export async function initializeDatabase() {
  try {
    console.log('🔄 Initializing Eduzenta Database Schema & Seed Data...');
    const connection = await pool.getConnection();

    try {
      // 1. Create SCHOOLS table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`schools\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`name\` VARCHAR(255) NOT NULL,
          \`status\` VARCHAR(50) DEFAULT 'Active',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

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
          \`class_section\` VARCHAR(50) DEFAULT 'Class 10-A',
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

      // 7. SUPER ADMIN SEED — ONLY CREATE IF NOT EXISTS (DO NOT OVERWRITE ON RESTART)
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'developerwithkhan804@gmail.com';
      const rawSeedPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';

      const [existingUser] = await connection.query(
        'SELECT id, email, role FROM users WHERE email = ?',
        [superAdminEmail]
      );

      if (!existingUser || existingUser.length === 0) {
        const hashedPassword = await bcrypt.hash(rawSeedPassword, 10);
        await connection.query(
          `INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (NULL, ?, ?, ?, 'super_admin', 1)`,
          ['Eduzenta Super Admin', superAdminEmail, hashedPassword]
        );
        console.log(`✅ Super Admin Account Seeded: ${superAdminEmail}`);
      } else {
        console.log(`ℹ️ Super Admin Account Verified in Database: ${superAdminEmail}`);
      }

    } finally {
      connection.release();
    }
    console.log('✅ Database Schema Auto-Migration & Persistence Check Completed Successfully.');
  } catch (error) {
    console.error('❌ Database Initialization Failed:', error.message);
  }
}
