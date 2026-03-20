const SALAMI_CONFIG = {
    minAmount: 1,
    maxAmount: 10,
    decimalPlaces: 2,
    unit: "BDT."
};

exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            success: true,
            config: SALAMI_CONFIG
        })
    };
};
