type SupabaseLikeError = {
  code?: string;
  status?: number;
  message?: string;
};

let socialFollowsUnavailable = false;

export function canQuerySocialFollows() {
  return !socialFollowsUnavailable;
}

export function markSocialFollowsError(action: string, error: unknown) {
  if (!error) return;

  const err = error as SupabaseLikeError;
  const missingRelation =
    err.code === "PGRST205" ||
    err.status === 404 ||
    err.message?.includes("follows");

  if (missingRelation) {
    socialFollowsUnavailable = true;
  }

  console.warn(`follows ${action} failed`, error);
}
