// Prepara la base de datos antes de arrancar el servidor.
//
// El proyecto nunca tuvo una migracion inicial (las tablas base se crearon
// con "prisma db push" y las migraciones solo agregan cambios encima), asi
// que en una base VACIA "migrate deploy" falla. Para ese caso: se crea el
// esquema actual de una vez y se marcan las migraciones existentes como ya
// aplicadas. En una base que ya tiene historial solo se aplican las nuevas.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function ejecutar(comando) {
  console.log(`> ${comando}`);
  execSync(comando, { stdio: 'inherit' });
}

async function main() {
  const prisma = new PrismaClient();
  let sinHistorial;
  let hayTablas;
  try {
    const historial = await prisma.$queryRawUnsafe("select to_regclass('public._prisma_migrations')::text as t");
    const tablas = await prisma.$queryRawUnsafe(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'"
    );
    sinHistorial = !historial[0].t;
    hayTablas = tablas[0].n > 0;
  } finally {
    await prisma.$disconnect();
  }

  if (sinHistorial && !hayTablas) {
    console.log('Base de datos vacia: creando el esquema actual...');
    ejecutar('npx prisma db push --skip-generate');
    const carpeta = path.join(__dirname, '..', 'prisma', 'migrations');
    const migraciones = fs
      .readdirSync(carpeta, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const nombre of migraciones) {
      ejecutar(`npx prisma migrate resolve --applied ${nombre}`);
    }
  }

  ejecutar('npx prisma migrate deploy');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
