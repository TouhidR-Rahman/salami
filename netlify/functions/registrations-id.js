const { MongoClient, ObjectId } = require('mongodb');

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
    // Extract ID from path
    const id = event.path.split('/').pop();
    
    if (!id || !ObjectId.isValid(id)) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Invalid registration ID' })
        };
    }

    try {
        const client = await getMongoClient();
        const db = client.db('salamiapp');
        const collection = db.collection('registrations');

        // GET: Fetch single registration
        if (event.httpMethod === 'GET') {
            const registration = await collection.findOne({ _id: new ObjectId(id) });

            if (!registration) {
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        success: false,
                        message: 'Registration not found' 
                    })
                };
            }

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true,
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
        }

        // DELETE: Delete registration
        if (event.httpMethod === 'DELETE') {
            const result = await collection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        success: false,
                        message: 'Registration not found' 
                    })
                };
            }

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

            const result = await collection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        name,
                        paymentMethod,
                        paymentNumber,
                        updatedAt: new Date()
                    }
                }
            );

            if (result.matchedCount === 0) {
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        success: false,
                        message: 'Registration not found' 
                    })
                };
            }

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
};
