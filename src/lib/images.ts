export const FALLBACK_IMAGE_URL = '/placeholder.svg';

const isValidImageUrl = (value?: string | null) => {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== FALLBACK_IMAGE_URL;
};

export const resolveImageUrl = (
  primary?: string | null,
  alternatives?: Array<string | null | undefined>,
) => {
  if (isValidImageUrl(primary)) return primary!.trim();

  const fallback = alternatives?.find((image) => isValidImageUrl(image));
  return fallback?.trim() || FALLBACK_IMAGE_URL;
};

export const sanitizeImageList = (images?: Array<string | null | undefined>) => {
  const seen = new Set<string>();

  return (images || []).reduce<string[]>((acc, image) => {
    const resolved = resolveImageUrl(image);

    if (resolved === FALLBACK_IMAGE_URL || seen.has(resolved)) {
      return acc;
    }

    seen.add(resolved);
    acc.push(resolved);
    return acc;
  }, []);
};