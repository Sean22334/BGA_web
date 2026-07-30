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
    capacity INT NOT NULL DEFAULT 50,
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
    status ENUM('Pending', 'Confirmed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (orientation_id) REFERENCES orientations(id) ON DELETE CASCADE,
    INDEX idx_ref (reference_number),
    INDEX idx_orientation (orientation_id),
    INDEX idx_status (status),
    INDEX idx_applicant_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- Initial Seed Data (fictional demo records)
-- Configure admin credentials via ADMIN_EMAIL / ADMIN_PASSWORD in .env for
-- standalone mode, or insert a bcrypt password_hash for MySQL production use.
-- =============================================================================

INSERT INTO admins (email, password_hash, name)
VALUES
('admin@example.com', '$2a$10$e8wzYx2kH2N8eU3W6q.K6.jJv0tZ2QvM1Yt4r3X2w1v0u', 'BGA Admissions Officer')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO orientations (id, title, branch, venue, description, date, start_time, end_time, capacity, reserved, status)
VALUES
(1, 'FREE Saturday Cruise Career Orientation', 'Tagum', 'Bluechef Main Training Center, Tagum City', 'Comprehensive orientation covering cruise ship career pathways, STCW requirements, and POEA agency placement.', '2026-08-01', '09:00 AM', '12:00 PM', 60, 42, 'Open'),
(2, 'FREE Saturday Cruise Career Orientation', 'Butuan', 'BGA Butuan Culinary Lab, JC Aquino Ave', 'Learn how to start a high-paying career on international cruise ships with TESDA & USPH accredited training.', '2026-08-01', '01:30 PM', '04:30 PM', 50, 48, 'Open'),
(3, 'FREE Saturday Cruise Career Orientation', 'Pagadian', 'BGA Pagadian Training Hall, Rizal Ave', 'Exclusive guidance session for aspiring seafarers, F&B stewards, and shipboard chefs.', '2026-08-08', '09:00 AM', '12:00 PM', 40, 40, 'Fully Booked'),
(4, 'FREE Saturday Cruise Career Orientation', 'Bacolod', 'BGA Bacolod Campus, Lacson St.', 'Free orientation session on cruise ship culinary and hospitality certifications.', '2026-08-08', '01:30 PM', '04:30 PM', 45, 12, 'Open')
ON DUPLICATE KEY UPDATE title=VALUES(title);

INSERT INTO reservations (orientation_id, reference_number, full_name, phone, email, address, city, province, notes, status)
VALUES
(1, 'BGA-2026-8492', 'Alex Rivera', '09170000001', 'alex.rivera@example.com', '123 Sample Street', 'Tagum City', 'Davao del Norte', 'Interested in Culinary Arts course', 'Confirmed'),
(1, 'BGA-2026-7310', 'Jane Doe', '09170000002', 'jane.doe@example.com', '456 Demo Avenue', 'Panabo City', 'Davao del Norte', 'Wants morning session evaluation', 'Pending'),
(2, 'BGA-2026-4198', 'John Smith', '09170000003', 'john.smith@example.com', '789 Test Boulevard', 'Butuan City', 'Agusan del Norte', 'Prior F&B experience in local resort', 'Confirmed');
