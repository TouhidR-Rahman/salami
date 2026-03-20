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

let mongoClient;

async function getMongoClient() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set. Please add it to Netlify environment variables.');
    }
    
    if (!mongoClient) {
        mongoClient = new MongoClient(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        await mongoClient.connect();
    }
    return mongoClient;
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
        const client = await getMongoClient();
        const db = client.db('salamiapp');
        const collection = db.collection('registrations');

        const registrations = await collection
            .find({})
            .sort({ registeredAt: -1 })
            .toArray();

        // Format salami amounts
        const formatted = registrations.map(reg => ({
            id: reg._id,
            name: reg.name,
            paymentMethod: reg.paymentMethod,
            paymentNumber: reg.paymentNumber,
            salamiAmount: reg.salamiAmount,
            salamiFormatted: formatSalamiAmount(reg.salamiAmount),
            registeredAt: reg.registeredAt
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
                message: 'Error fetching registrations: ' + error.message 
            })
        };
    }
}
