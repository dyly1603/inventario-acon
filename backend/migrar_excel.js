const xlsx = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const NOMBRE_ARCHIVO_EXCEL = 'inventario.xlsx.xlsm';
const rutaExcel = path.resolve(__dirname, NOMBRE_ARCHIVO_EXCEL);
const dbPath = path.resolve(__dirname, 'inventario.db');
const db = new sqlite3.Database(dbPath);

console.log('Leyendo libro de Excel completo...');

try {
  const workbook = xlsx.readFile(rutaExcel);
  const nombresPestanias = workbook.SheetNames;
  console.log(`Pestañas encontradas: ${nombresPestanias.join(', ')}`);

  db.serialize(() => {
    // Recrear la tabla asegurando todas las columnas
    db.run(`
      CREATE TABLE IF NOT EXISTS activos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        placa TEXT UNIQUE NOT NULL,
        serie TEXT UNIQUE NOT NULL,
        producto TEXT,
        marca TEXT,
        modelo TEXT,
        tipo TEXT,
        finca_depto TEXT,
        ubicacion TEXT,
        empresa TEXT,
        asignado_a TEXT,
        prestam TEXT,
        status TEXT DEFAULT 'Bueno',
        observaciones TEXT,
        traza TEXT,
        especificaciones TEXT,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO activos (
        placa, serie, producto, marca, modelo, tipo, finca_depto, ubicacion, empresa, asignado_a, prestam, status, observaciones, traza, especificaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let totalInsertados = 0;

    // Recorrer cada pestaña del Excel (Inventario TI, Laptops, Traslados, Bajas, etc.)
    nombresPestanias.forEach((nombreHoja) => {
      if (nombreHoja.toLowerCase().includes('empresa') || nombreHoja.toLowerCase().includes('traslado')) {
        return;
      }

      const worksheet = workbook.Sheets[nombreHoja];
      const filasMatriz = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      // Buscar la fila donde se encuentra la columna 'Placa'
      let filaEncabezados = -1;
      for (let i = 0; i < filasMatriz.length; i++) {
        const fila = filasMatriz[i];
        if (fila && fila.some(cell => String(cell).toLowerCase().includes('placa'))) {
          filaEncabezados = i;
          break;
        }
      }

      if (filaEncabezados === -1) {
        console.log(`[!] Omitiendo pestaña "${nombreHoja}" (No contiene columna "Placa").`);
        return;
      }

      const datos = xlsx.utils.sheet_to_json(worksheet, { range: filaEncabezados });
      let insertadosHoja = 0;

      datos.forEach((fila) => {
        const obtenerValor = (patron) => {
          const clave = Object.keys(fila).find(k => k.toLowerCase().trim().includes(patron.toLowerCase()));
          return clave && fila[clave] ? String(fila[clave]).trim() : '';
        };

        const placa = obtenerValor('placa');
        const serie = obtenerValor('serie');

        // Extraer especificaciones de hardware para Laptops (Windows, HDD, RAM, Procesador)
        const win = obtenerValor('window') || obtenerValor('so');
        const hdd = obtenerValor('hdd') || obtenerValor('disco');
        const ram = obtenerValor('ram');
        const proc = obtenerValor('proces');

        let especs = [];
        if (win) especs.push(`SO: ${win}`);
        if (proc) especs.push(`CPU: ${proc}`);
        if (ram) especs.push(`RAM: ${ram}`);
        if (hdd) especs.push(`Disco: ${hdd}`);

        const especificacionesStr = especs.join(' | ');

        if (placa || serie) {
          stmt.run([
            placa || 'S/P',
            serie || 'S/S',
            obtenerValor('producto') || (nombreHoja.toLowerCase().includes('laptop') ? 'Laptop' : ''),
            obtenerValor('marca'),
            obtenerValor('modelo'),
            obtenerValor('tipo'),
            obtenerValor('finca') || obtenerValor('departam'),
            obtenerValor('ubicac'),
            obtenerValor('empresa'),
            obtenerValor('asignado'),
            obtenerValor('préstam') || obtenerValor('prestam'),
            obtenerValor('status') || obtenerValor('estado') || 'Bueno',
            obtenerValor('observaci'),
            obtenerValor('traza'),
            especificacionesStr
          ]);
          insertadosHoja++;
        }
      });

      console.log(`✓ Pestaña "${nombreHoja}": ${insertadosHoja} activos procesados.`);
      totalInsertados += insertadosHoja;
    });

    stmt.finalize();
    console.log(`\n¡MIGRACIÓN COMPLETA! Se importaron en total ${totalInsertados} activos de todas las pestañas.`);
  });

} catch (error) {
  console.error('Error al procesar el archivo Excel:', error.message);
} finally {
  db.close();
}