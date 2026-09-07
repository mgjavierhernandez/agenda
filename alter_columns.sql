ALTER TABLE subjects ALTER COLUMN subject_type TYPE "SubjectType" USING subject_type::"SubjectType";
ALTER TABLE subjects ALTER COLUMN minimum_level TYPE "EducationLevel" USING minimum_level::"EducationLevel";
ALTER TABLE subjects ALTER COLUMN maximum_level TYPE "EducationLevel" USING maximum_level::"EducationLevel";
ALTER TABLE courses ALTER COLUMN level TYPE "EducationLevel" USING level::"EducationLevel";
ALTER TABLE classrooms ALTER COLUMN type TYPE "ClassroomType" USING type::"ClassroomType";