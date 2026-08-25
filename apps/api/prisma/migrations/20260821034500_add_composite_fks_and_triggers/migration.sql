-- ============================================================
-- Add composite unique constraints for composite FK support
-- ============================================================

-- Add composite unique constraint on roles(id, institution_id)
ALTER TABLE "roles" ADD CONSTRAINT "roles_id_institution_id_key" UNIQUE ("id", "institution_id");

-- Add composite unique constraint on user_institutions(id, institution_id)
ALTER TABLE "user_institutions" ADD CONSTRAINT "user_institutions_id_institution_id_key" UNIQUE ("id", "institution_id");

-- ============================================================
-- COMPOSITE FOREIGN KEYS for cross-tenant integrity
-- ============================================================

-- Composite FK: UserRole(roleId, institutionId) -> Role(id, institutionId)
-- Ensures that the referenced role belongs to the same institution as the UserRole
ALTER TABLE "user_roles"
  ADD CONSTRAINT "user_roles_role_institution_fkey"
  FOREIGN KEY ("role_id", "institution_id")
  REFERENCES "roles"("id", "institution_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Composite FK: UserRole(userInstitutionId, institutionId) -> UserInstitution(id, institutionId)
-- Ensures that the referenced membership belongs to the same institution as the UserRole
ALTER TABLE "user_roles"
  ADD CONSTRAINT "user_roles_membership_institution_fkey"
  FOREIGN KEY ("user_institution_id", "institution_id")
  REFERENCES "user_institutions"("id", "institution_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- TRIGGER: Prevent GlobalUserRole from referencing non-global roles
-- ============================================================

CREATE OR REPLACE FUNCTION check_global_role_is_global()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "roles"
    WHERE "id" = NEW."role_id"
      AND "institution_id" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'GlobalUserRole cannot reference a tenant-scoped role (institution_id must be NULL)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_global_role_is_global
  BEFORE INSERT OR UPDATE ON "global_user_roles"
  FOR EACH ROW
  EXECUTE FUNCTION check_global_role_is_global();
