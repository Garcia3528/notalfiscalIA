import { useState, useEffect } from 'react';
import { API_BASE } from '../utils/apiBase';

export default function EntityFormModal({
  isOpen,
  title,
  fields,
  initialData,
  endpointBase, // ex: '/fornecedores'
  mode, // 'create' | 'edit'
  onClose,
  onSaved,
}) {
  const [data, setData] = useState({ ativo: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setData(initialData ? { ...initialData, ativo: initialData?.ativo ?? true } : { ativo: true });
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleChange = (key, value) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = mode === 'edit' ? `${API_BASE}${endpointBase}/${initialData.id}` : `${API_BASE}${endpointBase}`;
      const method = mode === 'edit' ? 'PUT' : 'POST';
      const payload = { ...data, ativo: mode === 'create' ? true : data.ativo };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || result?.error || 'Erro ao salvar');
      onSaved?.(result);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-sm text-gray-700 mb-1">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={data[f.key] ?? ''}
                  placeholder={f.placeholder || ''}
                  onChange={e => handleChange(f.key, e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Campo de status oculto conforme requisito */}
          {/* No CREATE: status oculto == ATIVO; No UPDATE: status oculto, mantido */}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
