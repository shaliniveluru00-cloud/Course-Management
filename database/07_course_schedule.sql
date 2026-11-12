-- 07_course_schedule.sql
-- Run 03_courses_enrollments.sql before this file.
-- The daily timetable: one time slot and one room per course. Same every day.
-- course_id is the id from the courses table (1 = CS101 ... 15 = DS101).
--
-- Class periods (1 hour each, with a short break and a lunch break):
--   09:00-10:00   10:00-11:00   11:15-12:15   12:15-13:15   (lunch)   14:00-15:00   15:00-16:00   16:00-17:00
-- Each department has its own block, so departments run in parallel. All CSE courses and the
-- open elective DS101 are in different periods, so those students never have two classes at once.

CREATE TABLE IF NOT EXISTS course_schedule (
  id         INTEGER PRIMARY KEY,
  course_id  INTEGER NOT NULL UNIQUE REFERENCES courses(id),
  start_time TEXT NOT NULL,
  end_time   TEXT NOT NULL,
  room       TEXT NOT NULL,
  UNIQUE (start_time, room),
  CHECK (end_time > start_time)
);

INSERT INTO course_schedule (id, course_id, start_time, end_time, room) VALUES
  (1, 1, '09:00', '10:00', 'Block A, Room 101'),  -- CS101
  (2, 2, '10:00', '11:00', 'Block A, Room 102'),  -- CS102
  (3, 3, '11:15', '12:15', 'Block A, Room 201'),  -- CS201
  (4, 4, '12:15', '13:15', 'Block A, Lab 1'),  -- CS202
  (5, 5, '14:00', '15:00', 'Block A, Room 203'),  -- CS203
  (6, 6, '15:00', '16:00', 'Block A, Room 204'),  -- CS204
  (7, 7, '09:00', '10:00', 'Block B, Room 101'),  -- EC101
  (8, 8, '10:00', '11:00', 'Block B, Room 201'),  -- EC201
  (9, 9, '11:15', '12:15', 'Block B, Lab 1'),  -- EC202
  (10, 10, '12:15', '13:15', 'Block C, Room 101'),  -- EE101
  (11, 11, '14:00', '15:00', 'Block C, Room 201'),  -- EE201
  (12, 12, '15:00', '16:00', 'Block C, Lab 1'),  -- EE202
  (13, 13, '09:00', '10:00', 'Block D, Room 101'),  -- ME101
  (14, 14, '10:00', '11:00', 'Block D, Room 201'),  -- ME201
  (15, 15, '16:00', '17:00', 'Block E, Room 101');  -- DS101
