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
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        const db = getDatabase();
        const registrations = db.prepare(
            'SELECT * FROM registrations ORDER BY registeredAt DESC'
        ).all();

        // Format salami amounts
        const formatted = registrations.map(reg => ({
            ...reg,
            salamiFormatted: formatSalamiAmount(reg.salamiAmount)
        }));

        db.close();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: true,
                count: formatted.length,
                salamiConfig: SALAMI_CONFIG,
                registrations: formatted
            })
        };
    } catch (error) {
        console.error('Error fetching registrations:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: false,
                message: 'Error fetching registrations' 
            })
        };
    }
};
