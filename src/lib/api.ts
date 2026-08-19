export class APIError extends Error {
  public code: string;
  public status: number;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
  }
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new APIError(error instanceof Error ? error.message : 'Network request failed', 'NETWORK_ERROR', 0);
  }

  const contentType = response.headers.get('Content-Type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      try {
        const errorData = await response.json();
        throw new APIError(
          errorData.message || errorData.error || 'API Error',
          errorData.code || 'API_ERROR',
          response.status
        );
      } catch (parseError) {
        if (parseError instanceof APIError) throw parseError;
      }
    }
    throw new APIError(`HTTP Error ${response.status}`, 'HTTP_ERROR', response.status);
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (isJson) {
    return await response.json() as T;
  }

  throw new APIError('Response was not JSON', 'INVALID_CONTENT_TYPE', response.status);
}

export function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null) return source;
  if (typeof source !== 'object' || source === null) return source;

  const output = { ...target };
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!(key in target)) {
        Object.assign(output, { [key]: source[key] });
      } else {
        output[key] = deepMerge(target[key], source[key]);
      }
    } else {
      Object.assign(output, { [key]: source[key] });
    }
  });
  return output;
}
