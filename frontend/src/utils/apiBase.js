// Centraliza a base da API usando env do Vite, com opção de override em runtime
// Remove barra final para evitar '//'
const runtimeOverride = typeof window !== 'undefined' ? (localStorage.getItem('apiBaseOverride') || '').trim() : '';
const rawEnv = import.meta.env.VITE_API_BASE_URL || '/api';
const raw = runtimeOverride || rawEnv;
export const API_BASE = raw.replace(/\/$/, '');

// Loga a base atual para facilitar diagnóstico
if (typeof window !== 'undefined') {
  console.info('[API] Base URL:', API_BASE);
}

export const buildUrl = (path = '') => {
  const p = String(path || '');
  return `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
};

// Helper para obter chave Gemini do localStorage de forma consistente
export const getGeminiKey = () => localStorage.getItem('geminiKey') || '';

// Permite configurar override da base via código (salva em localStorage)
export const setApiBaseOverride = (url) => {
  if (typeof window !== 'undefined') {
    if (url && String(url).trim()) {
      localStorage.setItem('apiBaseOverride', String(url).trim());
    } else {
      localStorage.removeItem('apiBaseOverride');
    }
    console.info('[API] Override set to:', url ? String(url).trim() : '(cleared)');
  }
};
