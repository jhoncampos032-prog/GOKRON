-- AlterTable
ALTER TABLE "Asistencia" ADD COLUMN     "encargadoId" TEXT;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_encargadoId_fkey" FOREIGN KEY ("encargadoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
