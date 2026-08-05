/**
 * Bundled Lottie animations for the training-day card, mapped by sport group
 * (sports.group_name). Stage 1 of the sport-animation system — a remote
 * per-sport override layer (à la sport banners) can sit on top later.
 */
export const TRAINING_ANIMATIONS: Record<string, unknown> = {
    combat_sports: require('@/assets/animations/boxingbag.json'),
    strength: require('@/assets/animations/strength.json'),
    endurance: require('@/assets/animations/lower_plyo.json'),
    athletics: require('@/assets/animations/lower_plyo.json'),
    team_sports: require('@/assets/animations/upper_plyo.json'),
    racket_sports: require('@/assets/animations/upper_plyo.json'),
};

export const DEFAULT_TRAINING_ANIMATION = require('@/assets/animations/jump.json');

export function getTrainingAnimation(groupName?: string | null): unknown {
    return (groupName && TRAINING_ANIMATIONS[groupName]) || DEFAULT_TRAINING_ANIMATION;
}
