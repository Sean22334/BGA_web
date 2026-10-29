-- =============================================================================
-- Bluechef Global Academy (BGA) Orientation & Reservation Management Database Schema
-- MySQL 8.0+
-- =============================================================================

CREATE DATABASE IF NOT EXISTS bga_admissions_db;
USE bga_admissions_db;

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Orientations Table
CREATE TABLE IF NOT EXISTS orientations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'FREE Career Orientation',
    branch ENUM('Tagum', 'Butuan', 'Pagadian', 'Bacolod') NOT NULL DEFAULT 'Tagum',
    venue VARCHAR(255) NOT NULL DEFAULT 'Bluechef Training Center',
    description TEXT,
    date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL DEFAULT '09:00 AM',
    end_time VARCHAR(20) NOT NULL DEFAULT '12:00 PM',
    capacity INT NULL DEFAULT 50,
    reserved INT NOT NULL DEFAULT 0,
    status ENUM('Draft', 'Published', 'Open', 'Closed', 'Fully Booked') NOT NULL DEFAULT 'Published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_branch (branch),
    INDEX idx_status (status),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orientation_id INT NOT NULL,
    reference_number VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    notes TEXT,
    status ENUM('Pending', 'Confirmed', 'Cancelled') NOT NULL DEFAULT 'Confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (orientation_id) REFERENCES orientations(id) ON DELETE CASCADE,
    INDEX idx_ref (reference_number),
    INDEX idx_orientation (orientation_id),
    INDEX idx_status (status),
    INDEX idx_applicant_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- Accounts and reservations are intentionally not seeded in the schema.
-- Configure ADMIN_EMAIL / ADMIN_PASSWORD only for development standalone mode.
-- Provision a real bcrypt password_hash and role='admin' for MySQL administrators.
-- To add clearly marked future schedules to a development MySQL database only,
-- run server/seed-development.sql separately after this schema.
-- =============================================================================

-- =============================================================================
-- CMS Tables DDL
-- =============================================================================

-- 4. Site Settings (Key-Value configuration for hero, about, contact, social, footer)
CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value LONGTEXT NOT NULL,
    group_name VARCHAR(50) NOT NULL DEFAULT 'general',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_group (group_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. CMS Programs Table
CREATE TABLE IF NOT EXISTS cms_programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    program_id VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    badge VARCHAR(100) NOT NULL,
    short_description TEXT NOT NULL,
    duration VARCHAR(100) NOT NULL,
    eligibility VARCHAR(255) NOT NULL,
    image VARCHAR(500) NOT NULL,
    overview TEXT NOT NULL,
    highlights JSON NOT NULL,
    display_order INT DEFAULT 0,
    is_published TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. CMS Branches Table
CREATE TABLE IF NOT EXISTS cms_branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    hours VARCHAR(255) NOT NULL,
    map_url TEXT NOT NULL,
    image VARCHAR(500) NOT NULL,
    features JSON NOT NULL,
    display_order INT DEFAULT 0,
    is_published TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. CMS Gallery Table
CREATE TABLE IF NOT EXISTS cms_gallery (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    image VARCHAR(500) NOT NULL,
    display_order INT DEFAULT 0,
    is_published TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. CMS Testimonials Table
CREATE TABLE IF NOT EXISTS cms_testimonials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(150) NOT NULL,
    company VARCHAR(150) NOT NULL,
    quote TEXT NOT NULL,
    avatar VARCHAR(500) NOT NULL,
    branch_tag VARCHAR(150) NOT NULL,
    display_order INT DEFAULT 0,
    is_published TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. CMS FAQs Table
CREATE TABLE IF NOT EXISTS cms_faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faq_key VARCHAR(50) NOT NULL UNIQUE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    display_order INT DEFAULT 0,
    is_published TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. CMS Statistics Table
CREATE TABLE IF NOT EXISTS cms_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_key VARCHAR(50) NOT NULL UNIQUE,
    value VARCHAR(50) NOT NULL,
    label VARCHAR(150) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    display_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. CMS Partners Table
CREATE TABLE IF NOT EXISTS cms_partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    logo_url VARCHAR(500) DEFAULT NULL,
    display_order INT DEFAULT 0,
    is_published TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
