-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "googleDriveConectado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleDriveRefreshToken" TEXT;

