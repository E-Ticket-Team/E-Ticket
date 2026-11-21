-- AlterTable
ALTER TABLE "users"
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "googleId" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
