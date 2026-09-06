-- AddForeignKey
ALTER TABLE "MovimientoMaterial" ADD CONSTRAINT "MovimientoMaterial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
