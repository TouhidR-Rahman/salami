const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDB, getDB, closeDB } = require('./config/database');
const { generateSalamiAmount, formatSalamiAmount, SALAMI_CONFIG } = require('./config/salami');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes

// Serve index.html for root and any non-API paths
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Register endpoint
app.post('/api/register', (req, res) => {
    try {
        const { name, paymentMethod, paymentNumber } = req.body;

        // Validation
        if (!name || !paymentMethod || !paymentNumber) {
            return res.status(400).json({ 
                success: false,
                message: 'All fields are required' 
            });
        }

        if (!['bKash', 'Nagad'].includes(paymentMethod)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid payment method' 
            });
        }

        if (!/^\d{11}$/.test(paymentNumber)) {
            return res.status(400).json({ 
                success: false,
                message: 'Payment number must be exactly 11 digits' 
            });
        }

        // Generate random salami amount
        const salamiAmount = generateSalamiAmount();

        // Insert into database
        const db = getDB();
        const stmt = db.prepare(`
            INSERT INTO registrations (name, paymentMethod, paymentNumber, salamiAmount)
            VALUES (?, ?, ?, ?)
        `);

        const info = stmt.run(name.trim(), paymentMethod, paymentNumber, salamiAmount);

        // Fetch the inserted record
        const registration = db.prepare(
            'SELECT * FROM registrations WHERE id = ?'
        ).get(info.lastInsertRowid);

        res.status(201).json({ 
            success: true,
            message: 'Registration successful',
            registration: {
                ...registration,
                salamiFormatted: formatSalamiAmount(registration.salamiAmount)
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ 
                success: false,
                message: 'This payment number is already registered with this payment method' 
            });
        }

        res.status(500).json({ 
            success: false,
            message: 'Server error: ' + error.message 
        });
    }
});

// Get all registrations
app.get('/api/registrations', (req, res) => {
    try {
        const db = getDB();
        const registrations = db.prepare(
            'SELECT * FROM registrations ORDER BY registeredAt DESC'
        ).all();

        // Format salami amounts
        const formatted = registrations.map(reg => ({
            ...reg,
            salamiFormatted: formatSalamiAmount(reg.salamiAmount)
        }));

        res.json({ 
            success: true,
            count: formatted.length,
            salamiConfig: SALAMI_CONFIG,
            registrations: formatted
        });
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching registrations' 
        });
    }
});

// Get registration by ID
app.get('/api/registrations/:id', (req, res) => {
    try {
        const db = getDB();
        const registration = db.prepare(
            'SELECT * FROM registrations WHERE id = ?'
        ).get(req.params.id);

        if (!registration) {
            return res.status(404).json({ 
                success: false,
                message: 'Registration not found' 
            });
        }

        res.json({ 
            success: true,
            registration: {
                ...registration,
                salamiFormatted: formatSalamiAmount(registration.salamiAmount)
            }
        });
    } catch (error) {
        console.error('Error fetching registration:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching registration' 
        });
    }
});

// Delete registration by ID
app.delete('/api/registrations/:id', (req, res) => {
    try {
        const db = getDB();
        
        const registration = db.prepare(
            'SELECT * FROM registrations WHERE id = ?'
        ).get(req.params.id);

        if (!registration) {
            return res.status(404).json({ 
                success: false,
                message: 'Registration not found' 
            });
        }

        db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.id);

        res.json({ 
            success: true,
            message: 'Registration deleted successfully',
            registration: registration
        });
    } catch (error) {
        console.error('Error deleting registration:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error deleting registration' 
        });
    }
});

// Update registration by ID
app.put('/api/registrations/:id', (req, res) => {
    try {
        const { name, paymentMethod, paymentNumber } = req.body;
        const db = getDB();

        const registration = db.prepare(
            'SELECT * FROM registrations WHERE id = ?'
        ).get(req.params.id);

        if (!registration) {
            return res.status(404).json({ 
                success: false,
                message: 'Registration not found' 
            });
        }

        const stmt = db.prepare(`
            UPDATE registrations 
            SET name = ?, paymentMethod = ?, paymentNumber = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(name, paymentMethod, paymentNumber, req.params.id);

        const updated = db.prepare(
            'SELECT * FROM registrations WHERE id = ?'
        ).get(req.params.id);

        res.json({ 
            success: true,
            message: 'Registration updated successfully',
            registration: updated
        });
    } catch (error) {
        console.error('Error updating registration:', error);
        
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ 
                success: false,
                message: 'This payment number is already registered with this payment method' 
            });
        }

        res.status(500).json({ 
            success: false,
            message: 'Error updating registration' 
        });
    }
});

// Get salami configuration
app.get('/api/config/salami', (req, res) => {
    res.json({ 
        success: true,
        config: SALAMI_CONFIG
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'Endpoint not found' 
    });
});

// Start server
const startServer = () => {
    const dbInitialized = initDB();
    
    if (!dbInitialized) {
        console.error('Failed to initialize database.');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`🚀 Salami App Backend running on http://localhost:${PORT}`);
        console.log(`📝 Register: POST http://localhost:${PORT}/api/register`);
        console.log(`📊 All registrations: GET http://localhost:${PORT}/api/registrations`);
        console.log(`⚙️  Salami Config: GET http://localhost:${PORT}/api/config/salami`);
    });
};

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    closeDB();
    process.exit(0);
});

startServer();
