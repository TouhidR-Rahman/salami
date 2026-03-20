const Database = require('better-sqlite3');
const path = require('path');

// Salami config
const SALAMI_CONFIG = {
    minAmount: 1,
    maxAmount: 10,
    decimalPlaces: 2,
    unit: "BDT."
};

function generateSalamiAmount() {
    const min = SALAMI_CONFIG.minAmount;
    const max = SALAMI_CONFIG.maxAmount;
    const randomAmount = Math.random() * (max - min) + min;
    const rounded = Math.round(randomAmount * Math.pow(10, SALAMI_CONFIG.decimalPlaces)) / Math.pow(10, SALAMI_CONFIG.decimalPlaces);
    return rounded;
}

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
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { name, paymentMethod, paymentNumber } = body;

        // Validation
        if (!name || !paymentMethod || !paymentNumber) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: false,
                    message: 'All fields are required' 
                })
            };
        }

        if (!['bKash', 'Nagad'].includes(paymentMethod)) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: false,
                    message: 'Invalid payment method' 
                })
            };
        }

        if (!/^\d{11}$/.test(paymentNumber)) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: false,
                    message: 'Payment number must be exactly 11 digits' 
                })
            };
        }

        // Generate random salami amount
        const salamiAmount = generateSalamiAmount();

        // Insert into database
        const db = getDatabase();
        const stmt = db.prepare(`
            INSERT INTO registrations (name, paymentMethod, paymentNumber, salamiAmount)
            VALUES (?, ?, ?, ?)
        `);

        const info = stmt.run(name.trim(), paymentMethod, paymentNumber, salamiAmount);

        // Fetch the inserted record
        const registration = db.prepare(
            'SELECT * FROM registrations WHERE id = ?'
        ).get(info.lastInsertRowid);

        db.close();

        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: true,
                message: 'Registration successful',
                registration: {
                    ...registration,
                    salamiFormatted: formatSalamiAmount(registration.salamiAmount)
                }
            })
        };

    } catch (error) {
        console.error('Registration error:', error);
        
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
