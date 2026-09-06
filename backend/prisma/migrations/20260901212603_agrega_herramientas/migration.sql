-- CreateEnum
CREATE TYPE "EstadoHerramienta" AS ENUM ('DISPONIBLE', 'PRESTADA', 'MANTENIMIENTO', 'PERDIDA');

-- CreateTable
CREATE TABLE "Herramienta" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "estado" "EstadoHerramienta" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Herramienta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrestamoHerramienta" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "herramientaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "obraId" TEXT,
    "fechaPrestamo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDevolucion" TIMESTAMP(3),
    "notaPrestamo" TEXT,
    "notaDevolucion" TEXT,

    CONSTRAINT "PrestamoHerramienta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Herramienta" ADD CONSTRAINT "Herramienta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoHerramienta" ADD CONSTRAINT "PrestamoHerramienta_herramientaId_fkey" FOREIGN KEY ("herramientaId") REFERENCES "Herramienta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoHerramienta" ADD CONSTRAINT "PrestamoHerramienta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoHerramienta" ADD CONSTRAINT "PrestamoHerramienta_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
