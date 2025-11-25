import EntityTable from './EntityTable';

import { API_BASE } from '../utils/apiBase';

export default function ManterPessoas() {
  return (
    <div className="space-y-8">
      <EntityTable
        title="Fornecedor"
        endpointBase="/fornecedores"
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'razao_social', label: 'Razão Social', sortable: true },
          { key: 'nome_fantasia', label: 'Nome Fantasia', sortable: true },
          { key: 'cnpj', label: 'CNPJ', sortable: true },
          { key: 'telefone', label: 'Telefone', sortable: true },
        ]}
        formFields={[
          { key: 'razao_social', label: 'Razão Social', placeholder: 'Razão Social' },
          { key: 'nome_fantasia', label: 'Nome Fantasia', placeholder: 'Nome Fantasia' },
          { key: 'cnpj', label: 'CNPJ (14 dígitos)', placeholder: 'CNPJ sem máscara' },
          { key: 'endereco', label: 'Endereço', placeholder: 'Endereço completo' },
          { key: 'telefone', label: 'Telefone', placeholder: '(DD)Número' },
          { key: 'email', label: 'Email', type: 'email', placeholder: 'email@dominio.com' },
        ]}
        buildSearchUrl={(term) => `${API_BASE}/fornecedores/buscar?termo=${encodeURIComponent(term)}`}
        buildTodosUrl={() => `${API_BASE}/fornecedores?ativo=true`}
      />

      <EntityTable
        title="Cliente"
        endpointBase="/clientes"
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'nome_completo', label: 'Nome', sortable: true },
          { key: 'cpf', label: 'CPF', sortable: true },
          { key: 'cnpj', label: 'CNPJ', sortable: true },
          { key: 'telefone', label: 'Telefone', sortable: true },
        ]}
        formFields={[
          { key: 'nome_completo', label: 'Nome Completo', placeholder: 'Nome' },
          { key: 'cpf', label: 'CPF', placeholder: 'Somente dígitos' },
          { key: 'cnpj', label: 'CNPJ', placeholder: 'Opcional' },
          { key: 'telefone', label: 'Telefone', placeholder: '(DD)Número' },
          { key: 'email', label: 'Email', type: 'email', placeholder: 'email@dominio.com' },
        ]}
        buildSearchUrl={(term) => `${API_BASE}/clientes/buscar?q=${encodeURIComponent(term)}`}
        buildTodosUrl={() => `${API_BASE}/clientes`}
      />

      <EntityTable
        title="Faturado"
        endpointBase="/faturados"
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'nome_completo', label: 'Nome', sortable: true },
          { key: 'cpf', label: 'CPF', sortable: true },
          { key: 'email', label: 'Email', sortable: true },
        ]}
        formFields={[
          { key: 'nome_completo', label: 'Nome Completo', placeholder: 'Nome' },
          { key: 'cpf', label: 'CPF', placeholder: 'Somente dígitos' },
          { key: 'email', label: 'Email', type: 'email', placeholder: 'email@dominio.com' },
        ]}
        buildSearchUrl={(term) => `${API_BASE}/faturados/buscar?q=${encodeURIComponent(term)}`}
        buildTodosUrl={() => `${API_BASE}/faturados`}
      />
    </div>
  );
}
