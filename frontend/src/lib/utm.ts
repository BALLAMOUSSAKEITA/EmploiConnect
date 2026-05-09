const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function utmSuffixFromSearchParams(sp: URLSearchParams): string {
  const p = new URLSearchParams();
  for (const k of UTM_KEYS) {
    const v = sp.get(k);
    if (v) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function appendUtmToFormData(fd: FormData, sp: URLSearchParams): void {
  for (const k of UTM_KEYS) {
    const v = sp.get(k);
    if (v) fd.append(k, v);
  }
}
