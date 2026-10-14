-- ======================================================================
-- HOSPITAL MANAGEMENT SYSTEM (MediCare Hospital)
-- MODULE 5: RELATIONAL DATABASE TABLE CREATION & DDL SCHEMA
-- ======================================================================

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS medicare_hospital_db;
USE medicare_hospital_db;

-- Drop tables if already existing (clean state)
DROP TABLE IF EXISTS billing;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;

-- ----------------------------------------------------------------------
-- Table 1: DEPARTMENTS
-- Stores medical specialties and department details
-- ----------------------------------------------------------------------
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    head_of_department VARCHAR(100) NOT NULL,
    contact_extension VARCHAR(10),
    floor_number VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------
-- Table 2: USERS
-- System login credentials and role-based permissions
-- ----------------------------------------------------------------------
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('admin', 'doctor', 'receptionist', 'nurse', 'accountant') NOT NULL DEFAULT 'receptionist',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------
-- Table 3: DOCTORS
-- Clinical doctors and consultants linked to departments & users
-- ----------------------------------------------------------------------
CREATE TABLE doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    department_id INT NOT NULL,
    qualification VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    consultation_fee DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    available_days VARCHAR(100) DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    status ENUM('active', 'on_leave', 'retired') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------
-- Table 4: PATIENTS
-- In-patient and Out-patient registration records
-- ----------------------------------------------------------------------
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    uhid_number VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    age INT NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    residential_address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    emergency_contact_name VARCHAR(100) NOT NULL,
    emergency_relationship VARCHAR(50) NOT NULL,
    emergency_phone VARCHAR(20) NOT NULL,
    known_allergies TEXT,
    chronic_conditions TEXT,
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(50),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------
-- Table 5: APPOINTMENTS
-- Patient doctor consultation scheduling & status tracking
-- ----------------------------------------------------------------------
CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_code VARCHAR(20) NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    reason_for_visit TEXT,
    priority ENUM('normal', 'urgent', 'emergency') DEFAULT 'normal',
    status ENUM('Scheduled', 'In-Progress', 'Completed', 'Cancelled', 'No-Show') DEFAULT 'Scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------
-- Table 6: BILLING & INVOICES
-- Financial invoicing, breakdown, taxes, and payment status
-- ----------------------------------------------------------------------
CREATE TABLE billing (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(30) NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    appointment_id INT,
    bill_date DATE NOT NULL,
    consultation_fee DECIMAL(10, 2) DEFAULT 0.00,
    lab_tests_fee DECIMAL(10, 2) DEFAULT 0.00,
    pharmacy_fee DECIMAL(10, 2) DEFAULT 0.00,
    room_charges DECIMAL(10, 2) DEFAULT 0.00,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_mode ENUM('Cash', 'Credit Card', 'Debit Card', 'UPI', 'Insurance', 'Net Banking') NOT NULL,
    payment_status ENUM('Paid', 'Pending', 'Partially Paid', 'Cancelled') DEFAULT 'Paid',
    transaction_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================================================================
-- SAMPLE DATA INSERTION (FOR TESTING & VERIFICATION)
-- ======================================================================

-- Insert Departments
INSERT INTO departments (department_name, head_of_department, contact_extension, floor_number) VALUES
('Cardiology', 'Dr. Rajesh Rao', '101', '3rd Floor - Wing A'),
('Orthopedics', 'Dr. Suresh Verma', '102', '2nd Floor - Wing B'),
('Neurology', 'Dr. Meera Nambiar', '103', '4th Floor - Wing C'),
('Pediatrics', 'Dr. Anita Desai', '104', '1st Floor - Wing A'),
('General Medicine', 'Dr. Kavita Nair', '105', 'Ground Floor - OPD');

-- Insert Users
INSERT INTO users (username, password_hash, full_name, email, role) VALUES
('admin', '$2y$10$e8w8X9n...hashed...', 'System Administrator', 'admin@medicare.com', 'admin'),
('dr.ananya', '$2y$10$j8w1P2m...hashed...', 'Dr. Ananya Iyer', 'ananya.iyer@medicare.com', 'doctor'),
('reception', '$2y$10$q9k4Z1o...hashed...', 'Pooja Sharma', 'reception@medicare.com', 'receptionist');

-- Insert Doctors
INSERT INTO doctors (first_name, last_name, specialization, department_id, qualification, license_number, phone, email, consultation_fee) VALUES
('Ananya', 'Iyer', 'Cardiologist', 1, 'MD (Cardiology), DM', 'TN-MED-8491', '+91 98401 11222', 'ananya.iyer@medicare.com', 800.00),
('Suresh', 'Verma', 'Orthopedic Surgeon', 2, 'MS (Ortho), M.Ch', 'TN-MED-7320', '+91 98402 33444', 'suresh.verma@medicare.com', 750.00),
('Kavita', 'Nair', 'Consultant Physician', 5, 'MD (General Medicine)', 'TN-MED-6211', '+91 98403 55666', 'kavita.nair@medicare.com', 500.00);

-- Insert Patients
INSERT INTO patients (uhid_number, first_name, middle_name, last_name, date_of_birth, age, gender, blood_group, phone_number, email, residential_address, city, pincode, emergency_contact_name, emergency_relationship, emergency_phone) VALUES
('MED-2026-001', 'Rahul', 'Kumar', 'Verma', '1988-04-12', 38, 'Male', 'B+', '+91 98765 00001', 'rahul.verma@email.com', '12 Lake View Rd', 'Chennai', '600028', 'Pooja Verma', 'Spouse', '+91 98765 99991'),
('MED-2026-002', 'Sunita', 'Devi', 'Patel', '1995-09-25', 31, 'Female', 'O+', '+91 98765 00002', 'sunita.patel@email.com', '45 Gandhi St', 'Chennai', '600017', 'Ramesh Patel', 'Father', '+91 98765 99992');

-- Insert Appointments
INSERT INTO appointments (appointment_code, patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit, priority, status) VALUES
('APT-1001', 1, 1, '2026-10-15', '10:00:00', 'Routine Cardiac Checkup & ECG', 'normal', 'Scheduled'),
('APT-1002', 2, 2, '2026-10-15', '11:30:00', 'Knee Joint Pain Review', 'normal', 'Scheduled');

-- Insert Billing Invoices
INSERT INTO billing (invoice_number, patient_id, appointment_id, bill_date, consultation_fee, lab_tests_fee, pharmacy_fee, subtotal, tax_amount, total_amount, payment_mode, payment_status) VALUES
('INV-2026-001', 1, 1, '2026-10-14', 800.00, 1200.00, 450.00, 2450.00, 122.50, 2572.50, 'UPI', 'Paid'),
('INV-2026-002', 2, 2, '2026-10-14', 750.00, 500.00, 200.00, 1450.00, 72.50, 1522.50, 'Credit Card', 'Paid');

-- ======================================================================
-- SAMPLE SQL QUERY FOR DEMONSTRATION
-- ======================================================================
-- Query: Fetch patient appointment details with doctor and department name
SELECT 
    a.appointment_code,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    p.phone_number,
    CONCAT('Dr. ', d.first_name, ' ', d.last_name) AS doctor_name,
    dept.department_name,
    a.appointment_date,
    a.appointment_time,
    a.status
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id
JOIN doctors d ON a.doctor_id = d.doctor_id
JOIN departments dept ON d.department_id = dept.department_id
ORDER BY a.appointment_date ASC;
