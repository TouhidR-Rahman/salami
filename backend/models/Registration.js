const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['bKash', 'Nagad'],
        default: 'bKash'
    },
    paymentNumber: {
        type: String,
        required: true,
        unique: true,
        match: /^\d{11}$/,
        index: true
    },
    registeredAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound unique index to allow same number in different payment methods
registrationSchema.index({ paymentNumber: 1, paymentMethod: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
