import EntityTable from './EntityTable';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function ManterClassificacao() {
  return (
    <div className="space-y-8">
      <EntityTable
        title="Tipo de Receita"
        endpointBase="/tipos-receita"
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'categoria', label: 'Categoria', sortable: true },
          { key: 'descricao', label: 'Descrição', sortable: true },
        ]}
        formFields={[
          { key: 'nome', label: 'Nome', placeholder: 'Ex.: Venda de Safra' },
          { key: 'categoria', label: 'Categoria', placeholder: 'Ex.: OPERACIONAL' },
          { key: 'descricao', label: 'Descrição', placeholder: 'Detalhes (opcional)' },
        ]}
        // Sem endpoint de buscar; usa Todos para carregar ativos
        buildTodosUrl={() => `${API_BASE}/tipos-receita`}
      />

      <EntityTable
        title="Tipo de Despesa"
        endpointBase="/tipos-despesa"
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'categoria', label: 'Categoria', sortable: true },
          { key: 'descricao', label: 'Descrição', sortable: true },
        ]}
        formFields={[
          { key: 'nome', label: 'Nome', placeholder: 'Ex.: Energia Elétrica' },
          { key: 'categoria', label: 'Categoria', placeholder: 'Ex.: INFRAESTRUTURA E UTILIDADES' },
          { key: 'descricao', label: 'Descrição', placeholder: 'Detalhes (opcional)' },
        ]}
        buildSearchUrl={(term) => `${API_BASE}/tipos-despesa/buscar?termo=${encodeURIComponent(term)}`}
        buildTodosUrl={() => `${API_BASE}/tipos-despesa`}
      />
    </div>
  );
}