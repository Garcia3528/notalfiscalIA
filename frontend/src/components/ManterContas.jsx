import EntityTable from './EntityTable';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function ManterContas() {
  return (
    <div className="space-y-8">
      <EntityTable
        title="Contas a Pagar"
        endpointBase="/contas-pagar"
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'numero_nota_fiscal', label: 'NF', sortable: true },
          { key: 'data_emissao', label: 'Emissão', sortable: true },
          { key: 'valor_total', label: 'Valor', sortable: true },
          { key: 'fornecedor_nome_fantasia', label: 'Fornecedor', sortable: true },
          { key: 'faturado_nome', label: 'Faturado', sortable: true },
        ]}
        formFields={[
          { key: 'fornecedor_id', label: 'Fornecedor ID', placeholder: 'ID do fornecedor' },
          { key: 'faturado_id', label: 'Faturado ID', placeholder: 'ID do faturado' },
          { key: 'numero_nota_fiscal', label: 'Número NF', placeholder: 'Número da nota' },
          { key: 'data_emissao', label: 'Data Emissão', type: 'date' },
          { key: 'valor_total', label: 'Valor Total', type: 'number', placeholder: '0.00' },
          { key: 'observacoes', label: 'Observações', placeholder: 'Opcional' },
        ]}
        buildSearchUrl={(term) => {
          const id = term.trim();
          // Busca por ID específico
          return `${API_BASE}/contas-pagar/${encodeURIComponent(id)}`;
        }}
        buildTodosUrl={() => `${API_BASE}/contas-pagar`}
        mapRows={(row) => ({
          ...row,
          valor_total: Number(row.valor_total),
        })}
      />

      <EntityTable
        title="Contas a Receber"
        endpointBase="/contas-receber"
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'numero_nota', label: 'NF', sortable: true },
          { key: 'data_emissao', label: 'Emissão', sortable: true },
          { key: 'valor_total', label: 'Valor', sortable: true },
          { key: 'cliente_id', label: 'Cliente ID', sortable: true },
        ]}
        formFields={[
          { key: 'cliente_id', label: 'Cliente ID', placeholder: 'ID do cliente' },
          { key: 'numero_nota', label: 'Número NF', placeholder: 'Número da nota' },
          { key: 'data_emissao', label: 'Data Emissão', type: 'date' },
          { key: 'valor_total', label: 'Valor Total', type: 'number', placeholder: '0.00' },
          { key: 'observacoes', label: 'Observações', placeholder: 'Opcional' },
        ]}
        buildSearchUrl={(term) => `${API_BASE}/contas-receber/${encodeURIComponent(term.trim())}`}
        buildTodosUrl={() => `${API_BASE}/contas-receber`}
        mapRows={(row) => ({
          ...row,
          valor_total: Number(row.valor_total),
        })}
      />
    </div>
  );
}