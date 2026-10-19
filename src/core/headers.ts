export function guardHeaders(): Record<string, string> {
  return {
    'x-robots-tag': 'noai, noimageai, noindex, nofollow',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store',
  };
}
