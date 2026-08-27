-- ============================================================
-- Eduzenta School OS — Enterprise MySQL Database Schema
-- Optimized for 20,000+ Students with High Performance Indexes
-- ============================================================

CREATE DATABASE IF NOT EXISTS `eduzenta_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `eduzenta_db`;

-- 1. CLASSES TABLE
CREATE TABLE IF NOT EXISTS `classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_name` VARCHAR(50) NOT NULL,
  `section` VARCHAR(10) NOT NULL,
  `teacher_id` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_class_section` (`class_name`, `section`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS `students` (
  `id` VARCHAR(50) PRIMARY KEY,
  `roll_number` VARCHAR(50) NOT NULL,
  `reg_no` VARCHAR(50) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `class_id` INT DEFAULT NULL,
  `class_section` VARCHAR(50) DEFAULT 'Class 10-A',
  `gender` ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
  `phone` VARCHAR(50) DEFAULT NULL,
  `guardian_name` VARCHAR(255) DEFAULT NULL,
  `photo_url` TEXT DEFAULT NULL,
  `status` ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_class_section` (`class_section`),
  INDEX `idx_roll_number` (`roll_number`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `class_section` VARCHAR(50) NOT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL DEFAULT 'Present',
  `marked_by` VARCHAR(255) DEFAULT 'Teacher',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_student_date` (`student_id`, `date`),
  INDEX `idx_attendance_date_class` (`date`, `class_section`),
  INDEX `idx_student_id` (`student_id`),
  FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. BROADCASTS & DIRECTIVES TABLE
CREATE TABLE IF NOT EXISTS `broadcasts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `image_url` TEXT DEFAULT NULL,
  `video_url` TEXT DEFAULT NULL,
  `target_school_id` VARCHAR(50) DEFAULT 'all',
  `sender` VARCHAR(255) NOT NULL DEFAULT 'Super Admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_target_school` (`target_school_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- INITIAL SEED DATA
-- ------------------------------------------------------------

-- Insert Sample Classes
INSERT IGNORE INTO `classes` (`id`, `class_name`, `section`) VALUES
(1, 'Class 10', 'A'),
(2, 'Class 10', 'B'),
(3, 'Class 9', 'A'),
(4, 'Class 9', 'B');

-- Insert Initial Sample Students
INSERT IGNORE INTO `students` (`id`, `roll_number`, `reg_no`, `name`, `class_section`, `gender`, `phone`, `guardian_name`, `status`) VALUES
('std_101', '101', 'REG-2026-001', 'Zainab Fatima', 'Class 10-A', 'Female', '+92 300 1234567', 'Tariq Mahmood', 'Active'),
('std_102', '102', 'REG-2026-002', 'Muhammad Ali', 'Class 10-A', 'Male', '+92 300 7654321', 'Raza Ali', 'Active'),
('std_103', '103', 'REG-2026-003', 'Ayesha Khan', 'Class 10-A', 'Female', '+92 301 9876543', 'Imran Khan', 'Active'),
('std_104', '104', 'REG-2026-004', 'Bilal Ahmed', 'Class 9-B', 'Male', '+92 302 4567890', 'Shahid Ahmed', 'Active');

-- Insert Sample Broadcast Directives
INSERT IGNORE INTO `broadcasts` (`id`, `title`, `description`, `image_url`, `video_url`, `target_school_id`, `sender`) VALUES
(1, 'Q3 System Policy & Mandatory Audit', 'All School Administrators must verify student fee chalans, sync final marks, and ensure attendance records are locked before the term deadline.', 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80', 'https://www.w3schools.com/html/mov_bbb.mp4', 'all', 'Alex Vance (Super Admin HQ)');
