const { sql } = require('@neondatabase/serverless');

const SALAMI_CONFIG = {
    minAmount: 1,
    maxAmount: 10,
    decimalPlaces: 2,
    unit: "BDT."
};

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
        // Initialize database
        await initDB();

        // GET: Fetch single registration
        if (event.httpMethod === 'GET') {
            const result = await sql`
                SELECT * FROM registrations WHERE id = ${id}
            `;

            if (result.length === 0) {
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        success: false,
                        message: 'Registration not found' 
                    })
                };
            }

            const registration = result[0];
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true,
                    registration: {
                        ...registration,
                        salamiFormatted: formatSalamiAmount(registration.salamiamount)
                    }
                })
            };
        }

        // DELETE: Delete registration
        if (event.httpMethod === 'DELETE') {
            await sql`DELETE FROM registrations WHERE id = ${id}`;

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true,
                    message: 'Registration deleted successfully'
                })
            };
        }

        // PUT: Update registration
        if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            const { name, paymentMethod, paymentNumber } = body;

            await sql`
                UPDATE registrations 
                SET name = ${name}, paymentMethod = ${paymentMethod}, paymentNumber = ${paymentNumber}, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ${id}
            `;

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true,
                    message: 'Registration updated successfully'
                })
            };
        }

        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };

    } catch (error) {
        console.error('Error:', error);
        
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: false,
                message: 'Server error: ' + error.message 
            })
        };
    }
}
