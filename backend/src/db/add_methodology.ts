import pool from './pool';

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Adding methodology column to papers table...');
    await client.query(`
      ALTER TABLE papers 
      ADD COLUMN IF NOT EXISTS methodology JSONB DEFAULT '{
        "architecture": null,
        "data_source": null,
        "metrics": {
          "accuracy": null,
          "latency": null,
          "recall": null
        }
      }';
    `);
    console.log('✅ Methodology column added');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
