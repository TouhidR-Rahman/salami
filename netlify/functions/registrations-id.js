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
    // Extract ID from path
    const id = event.path.split('/').pop();
    
    if (!id || isNaN(id)) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Invalid registration ID' })
        };
    }

    let client;
    try {
        const pool = await getPool();
        client = await pool.connect();
        
        await initDB(client);

        // GET: Fetch single registration
        if (event.httpMethod === 'GET') {
            const result = await client.query(
                'SELECT * FROM registrations WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                client.release();
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        success: false,
                        message: 'Registration not found' 
                    })
                };
            }

            const registration = result.rows[0];
            client.release();
            
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true,
                    registration: {
                        ...registration,
                        salamiFormatted: formatSalamiAmount(parseFloat(registration.salamiamount))
                    }
                })
            };
        }

        // DELETE: Delete registration
        if (event.httpMethod === 'DELETE') {
            await client.query('DELETE FROM registrations WHERE id = $1', [id]);
            client.release();

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

            await client.query(
                'UPDATE registrations SET name = $1, paymentMethod = $2, paymentNumber = $3, updatedAt = CURRENT_TIMESTAMP WHERE id = $4',
                [name, paymentMethod, paymentNumber, id]
            );

            client.release();

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true,
                    message: 'Registration updated successfully'
                })
            };
        }

        client.release();
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };

    } catch (error) {
        console.error('Error:', error);
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
