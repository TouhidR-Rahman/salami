const Database = require('better-sqlite3');
const path = require('path');

// Salami config
const SALAMI_CONFIG = {
    minAmount: 1,
    maxAmount: 10,
    decimalPlaces: 2,
    unit: "BDT."
};

function formatSalamiAmount(amount) {
    return `${amount.toFixed(SALAMI_CONFIG.decimalPlaces)} ${SALAMI_CONFIG.unit}`;
}

function getDatabase() {
    // Use /tmp for Netlify, backend/data for local development
    const DB_PATH = process.env.NETLIFY 
        ? '/tmp/salami.db' 
        : path.join(__dirname, '../../backend/data/salami.db');
    
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    
    // Initialize database schema if it doesn't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            paymentMethod TEXT NOT NULL CHECK(paymentMethod IN ('bKash', 'Nagad')),
            paymentNumber TEXT NOT NULL,
            salamiAmount REAL NOT NULL DEFAULT 0,
            registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(paymentNumber, paymentMethod)
        );

        CREATE INDEX IF NOT EXISTS idx_paymentNumber ON registrations(paymentNumber);
        CREATE INDEX IF NOT EXISTS idx_registeredAt ON registrations(registeredAt DESC);
    `);
    
    return db;
}

exports.handler = async (event, context) => {
    // Extract ID from path
    const id = event.path.split('/').pop();
    
    if (!id || isNaN(id)) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Invalid registration ID' })
        };
    }

    try {
        const db = getDatabase();

        // GET: Fetch single registration
        if (event.httpMethod === 'GET') {
            const registration = db.prepare(
                'SELECT * FROM registrations WHERE id = ?'
            ).get(id);

            db.close();

            if (!registration) {
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        success: false,
                        message: 'Registration not found' 
                    })
                };
            }

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true,
                    registration: {
                        ...registration,
                        salamiFormatted: formatSalamiAmount(registration.salamiAmount)
                    }
                })
            };
        }

        // DELETE: Delete registration
        if (event.httpMethod === 'DELETE') {
            const registration = db.prepare(
                'SELECT * FROM registrations WHERE id = ?'
            ).get(id);

            if (!registration) {
                db.close();
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        success: false,
                        message: 'Registration not found' 
                    })
                };
            }

            db.prepare('DELETE FROM registrations WHERE id = ?').run(id);
            db.close();

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true,
                    message: 'Registration deleted successfully',
                    registration: registration
                })
            };
        }

        // PUT: Update registration
        if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            const { name, paymentMethod, paymentNumber } = body;

            const registration = db.prepare(
                'SELECT * FROM registrations WHERE id = ?'
            ).get(id);

            if (!registration) {
                db.close();
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        success: false,
                        message: 'Registration not found' 
                    })
                };
            }

            const stmt = db.prepare(`
                UPDATE registrations 
                SET name = ?, paymentMethod = ?, paymentNumber = ?, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ?
            `);

            stmt.run(name, paymentMethod, paymentNumber, id);

            const updated = db.prepare(
                'SELECT * FROM registrations WHERE id = ?'
            ).get(id);

            db.close();

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true,
                    message: 'Registration updated successfully',
                    registration: updated
                })
            };
        }

        db.close();
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };

    } catch (error) {
        console.error('Error:', error);
        
        if (error.message.includes('UNIQUE constraint failed')) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: false,
                    message: 'This payment number is already registered with this payment method' 
                })
            };
        }

        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: false,
                message: 'Server error: ' + error.message 
            })
        };
    }
};
