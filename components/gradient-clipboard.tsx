import { Cyan, Electric } from '@/constants/theme';
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

export function GradientClipboardIcon({ size = 42 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 512 512">
            <Defs>
                <SvgLinearGradient id="clip-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0" stopColor={Cyan[500]} />
                    <Stop offset="1" stopColor={Electric[500]} />
                </SvgLinearGradient>
            </Defs>
            <Path
                d="M336 64h32a48 48 0 0148 48v320a48 48 0 01-48 48H144a48 48 0 01-48-48V112a48 48 0 0148-48h32"
                fill="none" stroke="url(#clip-grad)" strokeWidth="32" strokeLinejoin="round"
            />
            <Path
                d="M336 96H176a16 16 0 01-16-16v-16a64 64 0 01128 0v16a16 16 0 01-16 16z"
                fill="url(#clip-grad)"
            />
        </Svg>
    );
}