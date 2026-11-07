-- 04_assignments.sql
-- Run Users.sql, 02_students_faculty.sql, and 03_courses_enrollments.sql before this file.
-- Creates two sample assignments for each of the 15 courses.

PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    max_marks INTEGER NOT NULL CHECK (max_marks > 0),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Assignment records
INSERT INTO assignments (id, course_id, title, description, due_date, max_marks) VALUES
    (1, 1, 'Array and Linked List Problems', 'Solve 5 problems involving array operations, searching, and linked-list manipulation.', '2026-11-18', 10),
    (2, 1, 'Sorting and Searching Analysis', 'Implement two sorting algorithms and compare their time complexities using test inputs.', '2026-11-28', 20),
    (3, 2, 'Classes and Objects', 'Create Java classes for a simple library system using constructors, fields, and methods.', '2026-11-18', 10),
    (4, 2, 'Inheritance and Polymorphism', 'Implement an inheritance hierarchy and demonstrate method overriding and runtime polymorphism.', '2026-11-28', 20),
    (5, 3, 'SQL Queries and Joins', 'Write SQL queries using SELECT, WHERE, ORDER BY, GROUP BY, and aggregate functions.', '2026-11-18', 10),
    (6, 3, 'Database Design Project', 'Design a normalized relational schema and write queries using joins and subqueries.', '2026-11-28', 20),
    (7, 4, 'Process Management', 'Explain process states and solve scheduling problems using FCFS and Round Robin.', '2026-11-18', 10),
    (8, 4, 'Synchronization Exercise', 'Implement a producer-consumer solution and explain the role of semaphores or mutexes.', '2026-11-28', 20),
    (9, 5, 'Networking Fundamentals', 'Solve problems on IP addressing, subnet masks, and packet switching.', '2026-11-18', 10),
    (10, 5, 'Socket Programming', 'Build a simple client-server application and explain the TCP connection flow.', '2026-11-28', 20),
    (11, 6, 'CFG Construction', 'Construct context-free grammars for the given languages and justify their productions.', '2026-11-18', 10),
    (12, 6, 'Turing Machine Design', 'Design Turing machines for two specified languages and trace their execution.', '2026-11-28', 20),
    (13, 7, 'Combinational Logic Design', 'Design and simplify combinational circuits using Boolean algebra and Karnaugh maps.', '2026-11-18', 10),
    (14, 7, 'Sequential Circuit Design', 'Design a synchronous counter using flip-flops and verify its state sequence.', '2026-11-28', 20),
    (15, 8, 'Signals and Waveforms', 'Solve problems involving basic continuous-time signals and their transformations.', '2026-11-18', 10),
    (16, 8, 'Fourier Series Analysis', 'Find Fourier-series representations for the given periodic signals.', '2026-11-28', 20),
    (17, 9, 'Microprocessor Instruction Set', 'Write short assembly routines using arithmetic, branching, and data-transfer instructions.', '2026-11-18', 10),
    (18, 9, 'Microcontroller Interfacing', 'Prepare an interfacing design for a sensor or display and explain the control signals.', '2026-11-28', 20),
    (19, 10, 'Circuit Analysis', 'Solve DC network problems using Kirchhoff''s laws and nodal analysis.', '2026-11-18', 10),
    (20, 10, 'Network Theorems', 'Apply Thevenin''s and Norton''s theorems to simplify the given circuits.', '2026-11-28', 20),
    (21, 11, 'Transformer Performance', 'Solve numerical problems on transformer equivalent circuits and efficiency.', '2026-11-18', 10),
    (22, 11, 'Electrical Machines Study', 'Compare the operating principles and characteristics of DC and induction machines.', '2026-11-28', 20),
    (23, 12, 'Control System Modelling', 'Obtain transfer functions for simple systems using block-diagram reduction.', '2026-11-18', 10),
    (24, 12, 'Stability Analysis', 'Analyze system stability using the Routh-Hurwitz criterion.', '2026-11-28', 20),
    (25, 13, 'Statics Problem Set', 'Solve problems involving force systems, moments, and equilibrium of rigid bodies.', '2026-11-18', 10),
    (26, 13, 'Truss Analysis', 'Determine member forces in a plane truss using method of joints or sections.', '2026-11-28', 20),
    (27, 14, 'First Law of Thermodynamics', 'Solve closed-system energy balance problems involving heat and work.', '2026-11-18', 10),
    (28, 14, 'Thermodynamic Cycle Analysis', 'Analyze a basic thermodynamic cycle and calculate its efficiency.', '2026-11-28', 20),
    (29, 15, 'Data Cleaning and Visualization', 'Clean a small dataset and create suitable summary statistics and visualizations.', '2026-11-18', 10),
    (30, 15, 'Exploratory Data Analysis', 'Analyze a dataset, identify patterns, and submit a short report with plots and conclusions.', '2026-11-28', 20);

COMMIT;
