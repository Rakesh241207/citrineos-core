'use strict';
import { QueryInterface } from 'sequelize';

// Creates MCS profile/plan tables for AI scheduling
export = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "mcs_profiles" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid NOT NULL,
        name text,
        profile jsonb NOT NULL,
        status text DEFAULT 'draft',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "mcs_plans" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id uuid NOT NULL REFERENCES mcs_profiles(id) ON DELETE CASCADE,
        plan jsonb NOT NULL,
        status text DEFAULT 'active',
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "plan_audit" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id uuid REFERENCES mcs_plans(id),
        action text,
        reason text,
        metadata jsonb,
        timestamp timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_mcs_profiles_owner ON mcs_profiles(owner_id);
      CREATE INDEX IF NOT EXISTS idx_mcs_plans_profile ON mcs_plans(profile_id);
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS "plan_audit";
      DROP TABLE IF EXISTS "mcs_plans";
      DROP TABLE IF EXISTS "mcs_profiles";
    `);
  },
};
