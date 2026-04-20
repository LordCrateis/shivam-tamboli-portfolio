export const ADMIN_EMAIL = 'shivamrtamboli62@gmail.com';

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL;
}

export function getAdminAvatarUrl(userMetadata: Record<string, unknown> | undefined): string | null {
  const avatarUrl = userMetadata?.avatar_url;
  if (typeof avatarUrl === 'string' && avatarUrl.trim()) {
    return avatarUrl;
  }

  const picture = userMetadata?.picture;
  if (typeof picture === 'string' && picture.trim()) {
    return picture;
  }

  return null;
}
