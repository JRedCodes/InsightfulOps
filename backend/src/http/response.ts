export type ApiError = {
  code: string;
  message: string;
};

export function ok<T>(data: T) {
  return { ok: true as const, data };
}

export function err(error: ApiError) {
  return { ok: false as const, error };
}
