const { MongoClient } = require('mongodb');

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

        // Connect to MongoDB
        const client = await getMongoClient();
        const db = client.db('salamiapp');
        const collection = db.collection('registrations');

        // Check for duplicate
        const existing = await collection.findOne({ paymentNumber, paymentMethod });
        if (existing) {
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
        const result = await collection.insertOne({
            name: name.trim(),
            paymentMethod,
            paymentNumber,
            salamiAmount,
            registeredAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Fetch the inserted record
        const registration = await collection.findOne({ _id: result.insertedId });

        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: true,
                message: 'Registration successful',
                registration: {
                    id: registration._id,
                    name: registration.name,
                    paymentMethod: registration.paymentMethod,
                    paymentNumber: registration.paymentNumber,
                    salamiAmount: registration.salamiAmount,
                    salamiFormatted: formatSalamiAmount(registration.salamiAmount),
                    registeredAt: registration.registeredAt
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
