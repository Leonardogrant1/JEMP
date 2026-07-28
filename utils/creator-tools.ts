export function canUseCreatorTools(role: string | null | undefined): boolean {
    return role === 'affiliate' || role === 'admin';
}
