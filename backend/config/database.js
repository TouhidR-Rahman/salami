const Database = require('better-sqlite3');
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, '..', 'data', 'salami.db');

let db = null;

const initDB = () => {
    try {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');

        // Create registrations table
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

        console.log('✅ SQLite database initialized successfully');
        console.log(`📁 Database file: ${DB_PATH}`);
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        return false;
    }
};

const getDB = () => {
    if (!db) {
        initDB();
    }
    return db;
};

const closeDB = () => {
    if (db) {
        db.close();
        db = null;
        console.log('Database connection closed');
    }
};

module.exports = {
    initDB,
    getDB,
    closeDB,
    DB_PATH
};
