export function livekitIdentityBelongsToUser(identity: string, userId: string): boolean {
  const prefix = `u_${userId.slice(0, 8)}_`;
  return identity.startsWith(prefix) && /^[A-Za-z0-9_-]{5,}$/.test(identity.slice(prefix.length));
}
