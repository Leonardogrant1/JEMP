import { CategoryI18n } from "@/constants/category-labels";
import { Ionicons } from "@expo/vector-icons";

export type Phase = 'sport' | 'environment' | 'equipment' | 'equipment-env' | 'goals' | 'body' | 'schedule' | 'weekly';

export interface EnvItem { id: string; slug: string; icon: keyof typeof Ionicons.glyphMap; name_i18n: Record<string, string> | null; description_i18n: Record<string, string> | null }
export interface EquipmentItem { id: string; slug: string; name_i18n: Record<string, string> | null }
export interface AmbiguousItem { id: string; slug: string; name_i18n: Record<string, string> | null; compatibleEnvIds: string[] }
export interface CategoryItem { id: string; slug: string; label: string; name_i18n: CategoryI18n }

