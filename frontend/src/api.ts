const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

export const API_URL =
  configuredApiUrl || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '/api')
