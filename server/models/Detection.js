const mongoose = require("mongoose");

const detectionSchema = new mongoose.Schema({
    angle: Number,
    distance: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model(
    "Detection",
    detectionSchema
);