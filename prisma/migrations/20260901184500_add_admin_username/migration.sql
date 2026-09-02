-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");
