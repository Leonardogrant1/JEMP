/**
 * Gebündelter Fallback für die Trainings-Animation: greift bei allen
 * Sportarten, für die weder der Sport noch seine Gruppe eine Remote-Animation
 * (sport-animations-Bucket) hat — und offline, bevor ein Download da ist.
 */
export const DEFAULT_TRAINING_ANIMATION = require('@/assets/animations/training-default.json');
