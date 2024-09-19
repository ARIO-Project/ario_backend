const mongoose = require('mongoose');

// MEASUREMENT ENTITY
const MenMeasurementSchema = new mongoose.Schema({

    //** BASIC MEASUREMENT FOR MEN */

    // TOP
    Neck: { type: Number}, // Circumference of the neck, measured around the base.
    Shoulder: { type: Number}, // Distance between shoulder seams, across the back.
    Wrist: { type: Number}, // Circumference of the wrist, where the sleeve ends.
    Chest: { type: Number}, // Circumference of the chest, under the armpits.
    LongSleeveLength: { type: Number}, // Length from shoulder seam to wrist.
    Bicep: { type: Number}, // Circumference of the bicep, around the fullest part.
    ShirtLength: { type: Number}, // Length from shoulder to hemline.
    AbdomenSize: { type: Number}, // Circumference around the widest part of the stomach.

    // TROUSER
    Waist: { type: Number}, // Circumference around the natural waistline.
    TrouserLength: { type: Number}, // Length from waist to ankle hemline.
    Laps: { type: Number}, // Circumference of the thigh, around the fullest part.
    Calf: { type: Number}, // Circumference of the calf, around the fullest part.
    KneeLength: { type: Number}, // Distance from waist to knee.
    Ankle: { type: Number}, // Circumference of the ankle, just above the ankle bone.

    //** ADDITIONAL MEASUREMENTS */
    Inseam: { type: Number}, // Length from crotch to hem of trousers.
    Outseam: { type: Number}, // Length from waist to hem of trousers.
    BackLength: { type: Number}, // Length from the base of the neck to the waistline.
    BustHeight: { type: Number}, // Distance from shoulder seam to bust point (for women).
    ShortSleeveLength: { type: Number}, // Length from shoulder seam to hem of a short sleeve.
    ThreeQuaterSleeveLength: { type: Number}, // Length from shoulder seam to mid-forearm.
    Elbow: { type: Number}, // Circumference of the elbow when slightly bent.
    Armhole: { type: Number}, // Circumference around the shoulder joint where arm meets shoulder.

});

module.exports = MenMeasurementSchema;
