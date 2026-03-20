const { MongoClient } = require('mongodb');

const SALAMI_CONFIG = {
    minAmount: 1,
    maxAmount: 10,
    decimalPlaces: 2,
    unit: "BDT."
};

function formatSalamiAmount(amount) {
    return `${amount.toFixed(SALAMI_CONFIG.decimalPlaces)} ${SALAMI_CONFIG.unit}`;
}

async function connectDB() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
    }
    
    const client = new MongoClient(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    
    await client.connect();
    return client;
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

    let client;
    try {
        client = await connectDB();
        const db = client.db('salamiapp');
        const collection = db.collection('registrations');

        const registrations = await collection
            .find({})
            .sort({ registeredAt: -1 })
            .toArray();

        // Format salami amounts
        const formatted = registrations.map(reg => ({
            id: reg._id,
            ...reg,
            salamiFormatted: formatSalamiAmount(reg.salamiAmount)
        }));

        await client.close();

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
        if (client) await client.close();
        
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
