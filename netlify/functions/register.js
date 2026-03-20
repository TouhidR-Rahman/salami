const { Pool } = require('@neondatabase/serverless');

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
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    let client;
    try {
        const pool = await getPool();
        client = await pool.connect();
        
        await initDB(client);

        const body = JSON.parse(event.body);
        const { name, paymentMethod, paymentNumber } = body;

        // Validation
        if (!name || !paymentMethod || !paymentNumber) {
            client.release();
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
            client.release();
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
            client.release();
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: false,
                    message: 'Payment number must be exactly 11 digits' 
                })
            };
        }

        // Check for duplicate
        const existing = await client.query(
            'SELECT * FROM registrations WHERE paymentNumber = $1 AND paymentMethod = $2',
            [paymentNumber, paymentMethod]
        );

        if (existing.rows.length > 0) {
            client.release();
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: false,
                    message: 'This payment number is already registered with this payment method' 
                })
            };
        }

        // Generate random salami amount
        const salamiAmount = generateSalamiAmount();

        // Insert registration
        const result = await client.query(
            'INSERT INTO registrations (name, paymentMethod, paymentNumber, salamiAmount) VALUES ($1, $2, $3, $4) RETURNING *',
            [name.trim(), paymentMethod, paymentNumber, salamiAmount]
        );

        const registration = result.rows[0];
        client.release();

        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: true,
                message: 'Registration successful',
                registration: {
                    ...registration,
                    salamiFormatted: formatSalamiAmount(parseFloat(registration.salamiamount))
                }
            })
        };

    } catch (error) {
        console.error('Registration error:', error);
        if (client) client.release();
        
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
