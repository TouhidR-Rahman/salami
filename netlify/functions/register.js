const { sql } = require('@neondatabase/serverless');

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

async function initDB() {
    const query = await sql`
        CREATE TABLE IF NOT EXISTS registrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            paymentMethod VARCHAR(50) NOT NULL CHECK(paymentMethod IN ('bKash', 'Nagad')),
            paymentNumber VARCHAR(11) NOT NULL,
            salamiAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
            registeredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(paymentNumber, paymentMethod)
        );
    `;
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

        // Initialize database
        await initDB();

        // Generate random salami amount
        const salamiAmount = generateSalamiAmount();

        // Check for duplicate
        const existing = await sql`
            SELECT * FROM registrations 
            WHERE paymentNumber = ${paymentNumber} AND paymentMethod = ${paymentMethod}
        `;

        if (existing.length > 0) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: false,
                    message: 'This payment number is already registered with this payment method' 
                })
            };
        }

        // Insert registration
        const result = await sql`
            INSERT INTO registrations (name, paymentMethod, paymentNumber, salamiAmount)
            VALUES (${name.trim()}, ${paymentMethod}, ${paymentNumber}, ${salamiAmount})
            RETURNING *
        `;

        const registration = result[0];

        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: true,
                message: 'Registration successful',
                registration: {
                    ...registration,
                    salamiFormatted: formatSalamiAmount(registration.salamiamount)
                }
            })
        };

    } catch (error) {
        console.error('Registration error:', error);
        
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
