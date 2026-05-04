// ─── Constants ──────────────────────────────────────────────────────────────

 

const ALL_STAT_SLUGS = [
    'strength',
    'lower_body_plyometrics',
    'upper_body_plyometrics',
    'jumps',
    'mobility',
] as const;

const CATEGORY_ICONS: Record<string, string> = {
    strength: 'barbell',
    jumps: 'arrow-up',
    lower_body_plyometrics: 'footsteps',
    upper_body_plyometrics: 'hand-right',
    mobility: 'body',
};

const STAT_LABELS: Record<string, string> = {
    strength: 'Strength',
    jumps: 'Jump',
    lower_body_plyometrics: 'Lower Plyo',
    upper_body_plyometrics: 'Upper Plyo',
    mobility: 'Mobility',
};

const RADAR_SLUGS = ['jumps', 'strength', 'upper_body_plyometrics', 'lower_body_plyometrics', 'mobility'] as const;

const RADAR_LABELS: Record<string, string> = {
    jumps: 'Jump',
    strength: 'Strength',
    upper_body_plyometrics: 'Up Plyo',
    lower_body_plyometrics: 'Low Plyo',
    mobility: 'Mobility',
};

const DROPDOWN_OPTIONS = [
    { key: 'all', labelKey: 'ui.progress_all_categories' },
    { key: 'strength', labelKey: 'category.strength' },
    { key: 'jumps', labelKey: 'category.jumps' },
    { key: 'lower_body_plyometrics', labelKey: 'category.lower_body_plyometrics' },
    { key: 'upper_body_plyometrics', labelKey: 'category.upper_body_plyometrics' },
    { key: 'mobility', labelKey: 'category.mobility' },
] as const;

const TIME_FRAMES = ['3M', '6M', '1Y'] as const;

const CHART_HEIGHT = 150;
const CHART_PAD_TOP = 12;
const CHART_PAD_BOTTOM = 28;

const MINI_SIZE = 44;
const MINI_STROKE = 4;
const MINI_R = (MINI_SIZE - MINI_STROKE) / 2;
const MINI_CX = MINI_SIZE / 2;
const MINI_CY = MINI_SIZE / 2;

const GAUGE_SIZE = 120;
const GAUGE_STROKE = 10;
const GAUGE_R = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CX = GAUGE_SIZE / 2;
const GAUGE_CY = GAUGE_SIZE / 2;
const GAUGE_START = 135;
const GAUGE_SWEEP = 270;

const OVERALL_SIZE = 120;
const OVERALL_STROKE = 10;
const OVERALL_R = (OVERALL_SIZE - OVERALL_STROKE) / 2;
const OVERALL_CX = OVERALL_SIZE / 2;
const OVERALL_CY = OVERALL_SIZE / 2; 

export { ALL_STAT_SLUGS, CATEGORY_ICONS, CHART_HEIGHT, CHART_PAD_BOTTOM, CHART_PAD_TOP, DROPDOWN_OPTIONS, GAUGE_CX, GAUGE_CY, GAUGE_R, GAUGE_SIZE, GAUGE_START, GAUGE_STROKE, GAUGE_SWEEP, MINI_CX, MINI_CY, MINI_R, MINI_SIZE, MINI_STROKE, OVERALL_CX, OVERALL_CY, OVERALL_R, OVERALL_SIZE, OVERALL_STROKE, RADAR_LABELS, RADAR_SLUGS, STAT_LABELS, TIME_FRAMES };
