-- AlterTable
ALTER TABLE "orders"
ALTER COLUMN "userId" DROP NOT NULL,
ADD COLUMN "guestName" TEXT,
ADD COLUMN "guestEmail" TEXT,
ADD COLUMN "guestPhone" TEXT,
ADD COLUMN "guestTokenHash" TEXT;
