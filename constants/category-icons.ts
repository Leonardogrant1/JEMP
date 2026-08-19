import JumpIcon from "@/assets/icons/jump_white.svg";
import LowerPlyoIcon from "@/assets/icons/lower_plyo_white.svg";
import MobilityIcon from "@/assets/icons/mobility_white.svg";
import StrengthIcon from "@/assets/icons/strength_white.svg";
import UpperPlyoIcon from "@/assets/icons/upper_plyo_white.svg";
import { ComponentType } from "react";
import { SvgProps } from "react-native-svg";

/**
 * Category SVG icons. Sources are white fills converted to currentColor via
 * .svgrrc — tint them with the `color` prop.
 */
export const CATEGORY_SVG_ICONS: Record<string, ComponentType<SvgProps>> = {
    strength: StrengthIcon,
    jumps: JumpIcon,
    lower_body_plyometrics: LowerPlyoIcon,
    upper_body_plyometrics: UpperPlyoIcon,
    mobility: MobilityIcon,
};
