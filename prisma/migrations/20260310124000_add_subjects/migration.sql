-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('JAVA', 'ARDUINO');

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN "subject" "Subject" NOT NULL DEFAULT 'JAVA';
ALTER TABLE "Variant" ADD COLUMN "number" INTEGER;

UPDATE "Variant"
SET "number" = "id"
WHERE "number" IS NULL;

ALTER TABLE "Variant" ALTER COLUMN "number" SET NOT NULL;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "subject" "Subject" NOT NULL DEFAULT 'JAVA';

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN "subject" "Subject" NOT NULL DEFAULT 'JAVA';

-- CreateIndex
CREATE UNIQUE INDEX "Variant_subject_number_key" ON "Variant"("subject", "number");
CREATE INDEX "Variant_subject_idx" ON "Variant"("subject");
CREATE INDEX "Question_subject_variantId_idx" ON "Question"("subject", "variantId");
