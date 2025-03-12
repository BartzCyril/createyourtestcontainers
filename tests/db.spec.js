const { GenericContainer } = require('testcontainers');
const { Pool, Client } = require('pg');
const path = require('path');
const fs = require('fs');

let container;
let pool;

jest.setTimeout(30000);

describe('PostgreSQL Test Container', () => {
    beforeAll(async () => {
        container = await new GenericContainer('postgres')
            .withExposedPorts(5432)
            .withEnvironment({
                'POSTGRES_USER': 'testuser',
                'POSTGRES_PASSWORD': 'testpassword',
                'POSTGRES_DB': 'testdb'
            })
            .start();

        const port = container.getMappedPort(5432);
        const host = container.getHost();

        pool = new Pool({
            user: 'testuser',
            host: host,
            database: 'testdb',
            password: 'testpassword',
            port: port,
        });

        console.log('PostgreSQL running on', host, port);

        const sqlPath = path.join(__dirname, '../config/database.sql');
        if (fs.existsSync(sqlPath)) {
            const sql = fs.readFileSync(sqlPath, 'utf-8');
            await pool.query(sql);
        }
    });

    afterAll(async () => {
        if (pool) {
            await pool.end().catch(err => console.error('Error closing pool', err));
        }
        if (container) {
            await container.stop();
        }
    });

    test('Vérifier la connexion à PostgreSQL', async () => {
        const res = await pool.query('SELECT NOW()');
        expect(res.rowCount).toBe(1);
    });

    test('Create', async () => {
        const res = await pool.query('INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *', ['Test Note', 'This is a test']);
        expect(res.rowCount).toBe(1);
        expect(res.rows[0].title).toBe('Test Note');
    });

    test('Read', async () => {
        const res = await pool.query('SELECT * FROM notes WHERE title = $1', ['Test Note']);
        expect(res.rowCount).toBe(1);
        expect(res.rows[0].content).toBe('This is a test');
    });

    test('Update', async () => {
        const res = await pool.query('UPDATE notes SET content = $1 WHERE title = $2 RETURNING *', ['Updated content', 'Test Note']);
        expect(res.rowCount).toBe(1);
        expect(res.rows[0].content).toBe('Updated content');
    });

    test('Delete', async () => {
        const res = await pool.query('DELETE FROM notes WHERE title = $1 RETURNING *', ['Test Note']);
        expect(res.rowCount).toBe(1);
    });
});