-- DropForeignKey
ALTER TABLE "PrestamoHerramienta" DROP CONSTRAINT "PrestamoHerramienta_usuarioId_fkey";

-- AlterTable
ALTER TABLE "PrestamoHerramienta" ALTER COLUMN "usuarioId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PrestamoHerramienta" ADD CONSTRAINT "PrestamoHerramienta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

