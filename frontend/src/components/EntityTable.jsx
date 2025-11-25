import { useState } from 'react';
import EntityFormModal from './EntityFormModal';
import { API_BASE } from '../utils/apiBase';

export default function EntityTable({
  title,
  endpointBase, // ex: '/fornecedores'
  columns, // [{ key, label, sortable }]
  buildSearchUrl, // (term) => `${API_BASE}${endpointBase}/buscar?q=...`
  buildTodosUrl, // () => `${API_BASE}${endpointBase}?ativo=true`
  formFields, // fields for EntityFormModal
  mapRows, // optional mapping function
}) {
  const [rows, setRows] = useState([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const fetchData = async (url) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Erro ao carregar');
      const payload = data?.data !== undefined ? data.data : data;
      const list = Array.isArray(payload) ? payload : (payload ? [payload] : []);
      setRows(mapRows ? list.map(mapRows) : list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = async () => {
    if (!buildSearchUrl) return;
    const term = searchTerm.trim();
    if (!term) return;
    await fetchData(buildSearchUrl(term));
  };

  const handleTodos = async () => {
    if (!buildTodosUrl) return;
    await fetchData(buildTodosUrl());
  };

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedRows = (() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return sortAsc ? -1 : 1;
      if (bv == null) return sortAsc ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  })();

  const handleDeleteLogical = async (row) => {
    try {
      const res = await fetch(`${API_BASE}${endpointBase}/${row.id}/inativar`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Erro ao inativar');
      setRows(prev => prev.filter(r => r.id !== row.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const openCreate = () => { setEditRow(null); setModalOpen(true); };
  const openEdit = (row) => { setEditRow(row); setModalOpen(true); };

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-gray-600 text-sm">Tabela inicia vazia. Use Buscar ou Todos.</p>
        </div>
        <button onClick={openCreate} className="px-3 py-2 bg-blue-600 text-white rounded">+ Novo</button>
      </div>

      <div className="px-6 py-4 flex gap-2">
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar por mais de um elemento..."
          className="flex-1 border border-gray-300 rounded px-3 py-2"
        />
        <button onClick={handleBuscar} className="px-3 py-2 bg-blue-500 text-white rounded">Buscar</button>
        <button onClick={handleTodos} className="px-3 py-2 bg-green-600 text-white rounded">Todos</button>
      </div>

      {error && (
        <div className="px-6"><div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">{error}</div></div>
      )}

      <div className="px-6 pb-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-3 py-2 border-b cursor-pointer select-none"
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="text-gray-700">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="ml-1 text-gray-500">{sortAsc ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 border-b">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={columns.length + 1}>Carregando...</td></tr>
            ) : sortedRows.length === 0 ? (
              <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={columns.length + 1}>Nenhum registro encontrado.</td></tr>
            ) : (
              sortedRows.map(row => (
                <tr key={row.id} className="odd:bg-gray-50">
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2 border-b">{String(row[col.key] ?? '')}</td>
                  ))}
                  <td className="px-3 py-2 border-b">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(row)} className="px-2 py-1 bg-indigo-600 text-white rounded">Editar</button>
                      <button onClick={() => handleDeleteLogical(row)} className="px-2 py-1 bg-red-600 text-white rounded">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EntityFormModal
        isOpen={modalOpen}
        title={editRow ? `Editar ${title}` : `Novo ${title}`}
        fields={formFields}
        initialData={editRow}
        endpointBase={endpointBase}
        mode={editRow ? 'edit' : 'create'}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          setEditRow(null);
          // Recarrega ATIVOS após salvar
          buildTodosUrl && fetchData(buildTodosUrl());
        }}
      />
    </div>
  );
}
