import { SLUG_TO_GROUP } from './exercise-groups';

// Static require map — filenames match assets/stock_images/ exactly
// (two files use .jpeg, rest use .jpg; hurdle_humps and load_carry are filename typos in the assets)
const GROUP_IMAGES: Record<string, any> = {
    squat_patterns:         require('@/assets/stock_images/squat_patterns.jpg'),
    hip_hinge:              require('@/assets/stock_images/hip_hinge.jpeg'),
    hip_thrust:             require('@/assets/stock_images/hip_thrust.jpg'),
    upper_push:             require('@/assets/stock_images/upper_push.jpg'),
    upper_pull:             require('@/assets/stock_images/upper_pull.jpg'),
    olympic_lifts:          require('@/assets/stock_images/olympic_lifts.jpg'),
    dumbbell_complex:       require('@/assets/stock_images/dumbbell_complex.jpg'),
    loaded_carry:           require('@/assets/stock_images/load_carry.jpg'),
    vertical_jumps:         require('@/assets/stock_images/vertical_jumps.jpg'),
    horizontal_jumps:       require('@/assets/stock_images/horizontal_jumps.jpg'),
    hurdle_hops:            require('@/assets/stock_images/hurdle_humps.jpg'),
    reactive_jumps:         require('@/assets/stock_images/reactive_jumps.jpg'),
    sprints:                require('@/assets/stock_images/sprints.jpg'),
    agility:                require('@/assets/stock_images/agility.jpg'),
    conditioning:           require('@/assets/stock_images/conditioning.jpg'),
    medicine_ball:          require('@/assets/stock_images/medicine_ball.jpg'),
    explosive_push:         require('@/assets/stock_images/explosive_push.jpg'),
    sled_exercises:         require('@/assets/stock_images/sled_exercises.jpeg'),
};

const FALLBACK = require('@/assets/images/splash-icon.png');

/** Maps a primary exercise slug → stock image via SLUG_TO_GROUP lookup */
export function getSessionImage(exerciseSlug?: string | null): any {
    if (!exerciseSlug) return FALLBACK;
    const group = SLUG_TO_GROUP[exerciseSlug];
    return GROUP_IMAGES[group] ?? FALLBACK;
}
