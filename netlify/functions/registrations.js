const { Pool } = require('@neondatabase/serverless');

const SALAMI_CONFIG = {
    minAmount: 1,
    maxAmount: 10,
    decimalPlaces: 2,
    unit: "BDT."
};

function formatSalamiAmount(amount) {
    return `${amount.toFixed(SALAMI_CONFIG.decimalPlaces)} ${SALAMI_CONFIG.unit}`;
}

async function getPool() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set. Please add it to Netlify environment variables.');
    }
    return new Pool({ connectionString: process.env.DATABASE_URL });
}

async function initDB(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS registrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            paymentMethod VARCHAR(50) NOT NULL CHECK(paymentMethod IN ('bKash', 'Nagad')),
            paymentNumber VARCHAR(11) NOT NULL,
            salamiAmount NUMERIC(10, 2) NOT NULL DEFAULT 0,
            registeredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(paymentNumber, paymentMethod)
        )
    `);
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
        // Initialize database
        await initDB();

        const registrations = await sql`
            SELECT * FROM registrations 
            ORDER BY registeredAt DESC
        `;

        // Format salami amounts
        const formatted = registrations.map(reg => ({
            ...reg,
            salamiFormatted: formatSalamiAmount(reg.salamiamount)
        }));

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
}
