import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Elimina un solicitante de prueba por cédula (prefijo 99 = datos de test).
 * Segura para ejecutar en producción porque solo borra datos con prefijo '99'.
 */
export async function deleteTestApplicant(cedula: string): Promise<void> {
  if (!cedula.startsWith('V-99')) {
    console.warn(`[cleanup] Skipping non-test cedula: ${cedula}`);
    return;
  }
  await pool.query('DELETE FROM Solicitantes WHERE cedula_solicitante = $1', [cedula]);
}

/**
 * Elimina un caso de prueba por su número.
 */
export async function deleteTestCase(nroCaso: number): Promise<void> {
  await pool.query('DELETE FROM Casos WHERE nro_caso = $1', [nroCaso]);
}

/**
 * Cierra el pool de conexiones.
 */
export async function closePool(): Promise<void> {
  await pool.end();
}