-- Reset database - Drop all tables and recreate them
-- Run this in MySQL: SOURCE database/reset.sql;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS ev_port_schedules;
DROP TABLE IF EXISTS ev_ports;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- Tables will be recreated by the application using db.create_all()
-- After running this, restart your Flask app or run: python -m backend.seed

