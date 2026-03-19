/**
 * Salami Amount Configuration
 * Control the range of salami amounts given to users
 */

const SALAMI_CONFIG = {
    // Minimum salami amount (in units - can be kg, pieces, etc.)
    minAmount: 100,
    
    // Maximum salami amount
    maxAmount: 500,
    
    // Number of decimal places to show
    decimalPlaces: 2,
    
    // Unit name (e.g., "grams", "kg", "pieces")
    unit: "grams"
};

/**
 * Generate random salami amount
 * Returns a random number between min and max with fractional values
 */
function generateSalamiAmount() {
    const min = SALAMI_CONFIG.minAmount;
    const max = SALAMI_CONFIG.maxAmount;
    
    // Generate random decimal number
    const randomAmount = Math.random() * (max - min) + min;
    
    // Round to specified decimal places
    const rounded = Math.round(randomAmount * Math.pow(10, SALAMI_CONFIG.decimalPlaces)) / Math.pow(10, SALAMI_CONFIG.decimalPlaces);
    
    return rounded;
}

/**
 * Format salami amount with unit
 */
function formatSalamiAmount(amount) {
    return `${amount.toFixed(SALAMI_CONFIG.decimalPlaces)} ${SALAMI_CONFIG.unit}`;
}

module.exports = {
    SALAMI_CONFIG,
    generateSalamiAmount,
    formatSalamiAmount
};
