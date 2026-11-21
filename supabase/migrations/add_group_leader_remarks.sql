-- Migration: Add remarks column to participations table for Group Leader designation
-- Used to identify the representative student in Group Items (e.g. '[LEADER]')
ALTER TABLE participations ADD COLUMN IF NOT EXISTS remarks text;
