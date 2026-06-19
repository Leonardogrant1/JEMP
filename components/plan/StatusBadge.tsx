import { type SessionStatus } from "@/providers/plan-provider";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { JempText } from "../jemp-text";

const STATUS_COLORS: Record<SessionStatus, string> = {
    scheduled: '#8c8c8c',
    in_progress: '#f59e0b',
    completed: '#14b8a6',
    skipped: '#6b7280',
    cancelled: '#ef4444',
};

export function StatusBadge({ status }: { status: SessionStatus }) {
    const { t } = useTranslation();
    const color = STATUS_COLORS[status];
    return (
        <View style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
            , { backgroundColor: `${color}22` }]}>
            <JempText type="caption" color={color}>{t(`session_status.${status}`)}</JempText>
        </View>
    );
}