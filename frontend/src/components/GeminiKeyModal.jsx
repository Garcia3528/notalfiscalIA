import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function GeminiKeyModal() {
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState('');
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  const setGlobalHeader = (k) => {
    if (k) {
      axios.defaults.headers.common['X-Gemini-Key'] = k;
    } else {
      delete axios.defaults.headers.common['X-Gemini-Key'];
    }
  };

  const testExistingKey = async (k) => {
    if (!k) return false;
    try {
      setTesting(true);
      const { data } = await axios.post(`${API_BASE}/ai/test-gemini`, {}, {
        headers: { 'X-Gemini-Key': k }
      });
      setTesting(false);
      if (data?.ok) {
        setStatus({ ok: true, message: 'Gemini conectado' });
        setGlobalHeader(k);
        return true;
      }
      setStatus({ ok: false, message: data?.message || 'Falha ao validar chave' });
      return false;
    } catch (err) {
      setTesting(false);
      setStatus({ ok: false, message: err?.response?.data?.message || err.message || 'Erro ao testar chave' });
      return false;
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('geminiKey');
    if (saved) {
      setKey(saved);
    }
    // Ao entrar no site, tenta validar uma chave salva; se não houver ou falhar, mostra modal
    (async () => {
      const ok = await testExistingKey(saved);
      if (!ok) {
        setVisible(true);
      }
    })();

    // Escuta eventos para solicitar chave novamente
    const requireHandler = () => {
      setStatus(null);
      setVisible(true);
    };
    window.addEventListener('gemini:require-key', requireHandler);
    return () => {
      window.removeEventListener('gemini:require-key', requireHandler);
    };
  }, []);

  const handleTestAndSave = async () => {
    const ok = await testExistingKey(key);
    if (ok) {
      localStorage.setItem('geminiKey', key);
      setVisible(false);
    }
  };

  const handleSkip = () => {
    // Usa a chave do backend (env) sem pedir ao usuário
    setGlobalHeader(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-gray-900">Chave Gemini</h2>
        <p className="text-sm text-gray-600 mt-1">Informe sua chave da API Gemini para ativar a extração por IA. A chave será validada e usada apenas nesta sessão.</p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">API Key</label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIza..."
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {status && (
          <div className={`mt-3 text-sm ${status.ok ? 'text-green-700' : 'text-red-700'}`}>{status.message}</div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={handleSkip} className="px-3 py-2 rounded bg-gray-100 text-gray-800">Pular</button>
          <button onClick={handleTestAndSave} disabled={testing || !key} className={`px-3 py-2 rounded ${testing || !key ? 'bg-blue-300' : 'bg-blue-600'} text-white`}>
            {testing ? 'Validando...' : 'Validar e Usar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GeminiKeyModal;