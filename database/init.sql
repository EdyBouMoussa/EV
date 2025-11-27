-- Create database and user (run in MySQL as root)
CREATE DATABASE IF NOT EXISTS ev_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ev_user'@'%' IDENTIFIED BY 'ev_password';
GRANT ALL PRIVILEGES ON ev_db.* TO 'ev_user'@'%';
FLUSH PRIVILEGES;