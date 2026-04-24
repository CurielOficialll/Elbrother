const { initConnection, getDb, saveDb } = require('./src/database/connection');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function runImport() {
    console.log('[IMPORT] Iniciando proceso de importación...');
    
    // Ruta al archivo de productos
    const productsFilePath = path.join(__dirname, 'products.txt');
    
    if (!fs.existsSync(productsFilePath)) {
        console.error(`[ERROR] No se encontró el archivo: ${productsFilePath}`);
        process.exit(1);
    }

    const rawList = fs.readFileSync(productsFilePath, 'utf8');

    await initConnection();
    const db = getDb();

    // Parse list
    const items = rawList
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => line !== '|')
        .map(line => line.toUpperCase())
        .filter(line => line !== 'OTRAS' && line !== 'OTROS');

    // Filter unique items in the list
    const uniqueItems = [...new Set(items)];
    console.log(`[IMPORT] ${uniqueItems.length} productos únicos encontrados en el archivo.`);

    const insertProduct = db.prepare(`
        INSERT INTO products (barcode, name, sell_price, cost_price, stock)
        VALUES (?, ?, 0, 0, 0)
    `);

    // Consulta para verificar si el producto ya existe por nombre
    const checkProduct = db.prepare('SELECT id FROM products WHERE name = ?');

    let inserted = 0;
    let skipped = 0;
    let existing = 0;

    db.transaction(() => {
        for (const item of uniqueItems) {
            // Verificar si ya existe
            const exists = checkProduct.get(item);
            if (exists) {
                existing++;
                continue;
            }

            // Generate a random unique 6-character barcode
            const barcode = crypto.randomBytes(3).toString('hex').toUpperCase();
            try {
                insertProduct.run(barcode, item);
                inserted++;
            } catch (e) {
                console.error(`[ERROR] Error al insertar "${item}":`, e.message);
                skipped++;
            }
        }
    })();

    console.log('\n[RESULTADOS]');
    console.log(`- Insertados: ${inserted}`);
    console.log(`- Ya existentes: ${existing}`);
    if (skipped > 0) console.log(`- Errores: ${skipped}`);
    
    console.log('\n[IMPORT] Guardando cambios en la base de datos...');
    saveDb();
    console.log('[IMPORT] ¡Proceso completado con éxito!');
    process.exit(0);
}

runImport().catch(err => {
    console.error('[CRITICAL ERROR]', err);
    process.exit(1);
});
