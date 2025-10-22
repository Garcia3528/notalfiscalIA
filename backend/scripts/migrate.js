const { pool } = require('../src/config/database');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migração do banco de dados...');

    // Habilitar extensão UUID
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Tabela de Fornecedores
    await client.query(`
      CREATE TABLE IF NOT EXISTS fornecedores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        razao_social VARCHAR(255) NOT NULL,
        nome_fantasia VARCHAR(255),
        cnpj VARCHAR(18) UNIQUE NOT NULL,
        endereco TEXT,
        telefone VARCHAR(20),
        email VARCHAR(255),
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome_completo VARCHAR(255) NOT NULL,
        cpf VARCHAR(14) UNIQUE,
        cnpj VARCHAR(18) UNIQUE,
        endereco TEXT,
        telefone VARCHAR(20),
        email VARCHAR(255),
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_cpf_or_cnpj CHECK (cpf IS NOT NULL OR cnpj IS NOT NULL)
      )
    `);

    // Tabela de Faturados
    await client.query(`
      CREATE TABLE IF NOT EXISTS faturados (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome_completo VARCHAR(255) NOT NULL,
        cpf VARCHAR(14) UNIQUE NOT NULL,
        endereco TEXT,
        telefone VARCHAR(20),
        email VARCHAR(255),
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Tipos de Despesa
    await client.query(`
      CREATE TABLE IF NOT EXISTS tipos_despesa (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome VARCHAR(255) NOT NULL UNIQUE,
        descricao TEXT,
        categoria VARCHAR(100) NOT NULL,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Tipos de Receita
    await client.query(`
      CREATE TABLE IF NOT EXISTS tipos_receita (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome VARCHAR(255) NOT NULL UNIQUE,
        descricao TEXT,
        categoria VARCHAR(100) NOT NULL,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Contas a Pagar
    await client.query(`
      CREATE TABLE IF NOT EXISTS contas_pagar (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        fornecedor_id UUID REFERENCES fornecedores(id),
        faturado_id UUID REFERENCES faturados(id),
        numero_nota_fiscal VARCHAR(50) NOT NULL,
        data_emissao DATE NOT NULL,
        descricao_produtos TEXT NOT NULL,
        valor_total DECIMAL(15,2) NOT NULL,
        observacoes TEXT,
        arquivo_pdf_path VARCHAR(500),
        dados_extraidos_json JSONB,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Contas a Receber
    await client.query(`
      CREATE TABLE IF NOT EXISTS contas_receber (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cliente_id UUID REFERENCES clientes(id),
        numero_nota_fiscal VARCHAR(50) NOT NULL,
        data_emissao DATE NOT NULL,
        descricao_produtos TEXT NOT NULL,
        valor_total DECIMAL(15,2) NOT NULL,
        observacoes TEXT,
        arquivo_pdf_path VARCHAR(500),
        dados_extraidos_json JSONB,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Parcelas (para contas a pagar e receber)
    await client.query(`
      CREATE TABLE IF NOT EXISTS parcelas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conta_pagar_id UUID REFERENCES contas_pagar(id),
        conta_receber_id UUID REFERENCES contas_receber(id),
        numero_parcela INTEGER NOT NULL,
        data_vencimento DATE NOT NULL,
        valor DECIMAL(15,2) NOT NULL,
        data_pagamento DATE,
        valor_pago DECIMAL(15,2),
        status VARCHAR(20) DEFAULT 'pendente', -- pendente, pago, vencido
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_conta_type CHECK (
          (conta_pagar_id IS NOT NULL AND conta_receber_id IS NULL) OR
          (conta_pagar_id IS NULL AND conta_receber_id IS NOT NULL)
        )
      )
    `);

    // Tabela de relacionamento entre Contas a Pagar e Tipos de Despesa
    await client.query(`
      CREATE TABLE IF NOT EXISTS conta_pagar_tipo_despesa (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conta_pagar_id UUID REFERENCES contas_pagar(id) ON DELETE CASCADE,
        tipo_despesa_id UUID REFERENCES tipos_despesa(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(conta_pagar_id, tipo_despesa_id)
      )
    `);

    // Tabela de relacionamento entre Contas a Receber e Tipos de Receita
    await client.query(`
      CREATE TABLE IF NOT EXISTS conta_receber_tipo_receita (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conta_receber_id UUID REFERENCES contas_receber(id) ON DELETE CASCADE,
        tipo_receita_id UUID REFERENCES tipos_receita(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(conta_receber_id, tipo_receita_id)
      )
    `);

    // Inserir tipos de despesa padrão
    await client.query(`
      INSERT INTO tipos_despesa (nome, descricao, categoria) VALUES
      ('Sementes', 'Sementes para plantio', 'INSUMOS AGRÍCOLAS'),
      ('Fertilizantes', 'Fertilizantes e adubos', 'INSUMOS AGRÍCOLAS'),
      ('Defensivos Agrícolas', 'Pesticidas e herbicidas', 'INSUMOS AGRÍCOLAS'),
      ('Corretivos', 'Corretivos de solo', 'INSUMOS AGRÍCOLAS'),
      ('Combustíveis e Lubrificantes', 'Diesel, gasolina, óleos', 'MANUTENÇÃO E OPERAÇÃO'),
      ('Peças e Componentes', 'Peças, parafusos, componentes mecânicos', 'MANUTENÇÃO E OPERAÇÃO'),
      ('Manutenção de Máquinas', 'Manutenção de máquinas e equipamentos', 'MANUTENÇÃO E OPERAÇÃO'),
      ('Pneus e Filtros', 'Pneus, filtros, correias', 'MANUTENÇÃO E OPERAÇÃO'),
      ('Ferramentas', 'Ferramentas e utensílios', 'MANUTENÇÃO E OPERAÇÃO'),
      ('Mão de Obra Temporária', 'Trabalho temporário', 'RECURSOS HUMANOS'),
      ('Salários e Encargos', 'Salários e encargos trabalhistas', 'RECURSOS HUMANOS'),
      ('Frete e Transporte', 'Serviços de transporte', 'SERVIÇOS OPERACIONAIS'),
      ('Colheita Terceirizada', 'Serviços de colheita', 'SERVIÇOS OPERACIONAIS'),
      ('Secagem e Armazenagem', 'Serviços de secagem e armazenamento', 'SERVIÇOS OPERACIONAIS'),
      ('Pulverização', 'Serviços de pulverização e aplicação', 'SERVIÇOS OPERACIONAIS'),
      ('Energia Elétrica', 'Conta de energia elétrica', 'INFRAESTRUTURA E UTILIDADES'),
      ('Arrendamento de Terras', 'Aluguel de terras', 'INFRAESTRUTURA E UTILIDADES'),
      ('Construções e Reformas', 'Obras e reformas', 'INFRAESTRUTURA E UTILIDADES'),
      ('Materiais de Construção', 'Materiais para construção', 'INFRAESTRUTURA E UTILIDADES'),
      ('Honorários Contábeis', 'Serviços contábeis', 'ADMINISTRATIVAS'),
      ('Honorários Advocatícios', 'Serviços advocatícios', 'ADMINISTRATIVAS'),
      ('Honorários Agronômicos', 'Serviços agronômicos', 'ADMINISTRATIVAS'),
      ('Despesas Bancárias', 'Taxas e despesas bancárias', 'ADMINISTRATIVAS'),
      ('Seguro Agrícola', 'Seguro da produção agrícola', 'SEGUROS E PROTEÇÃO'),
      ('Seguro de Ativos', 'Seguro de máquinas e veículos', 'SEGUROS E PROTEÇÃO'),
      ('Seguro Prestamista', 'Seguro prestamista', 'SEGUROS E PROTEÇÃO'),
      ('ITR', 'Imposto Territorial Rural', 'IMPOSTOS E TAXAS'),
      ('IPTU', 'Imposto Predial e Territorial Urbano', 'IMPOSTOS E TAXAS'),
      ('IPVA', 'Imposto sobre Propriedade de Veículos', 'IMPOSTOS E TAXAS'),
      ('INCRA-CCIR', 'Certificado de Cadastro de Imóvel Rural', 'IMPOSTOS E TAXAS'),
      ('Aquisição de Máquinas', 'Compra de máquinas e implementos', 'INVESTIMENTOS'),
      ('Aquisição de Veículos', 'Compra de veículos', 'INVESTIMENTOS'),
      ('Aquisição de Imóveis', 'Compra de imóveis', 'INVESTIMENTOS'),
      ('Infraestrutura Rural', 'Investimentos em infraestrutura', 'INVESTIMENTOS')
      ON CONFLICT (nome) DO NOTHING
    `);

    // Criar índices para melhor performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores(cnpj)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes(cnpj)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_faturados_cpf ON faturados(cpf)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor ON contas_pagar(fornecedor_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente ON contas_receber(cliente_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON parcelas(data_vencimento)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status)');

    console.log('✅ Migração concluída com sucesso!');
    console.log('📊 Tabelas criadas:');
    console.log('   - fornecedores');
    console.log('   - clientes');
    console.log('   - faturados');
    console.log('   - tipos_despesa');
    console.log('   - tipos_receita');
    console.log('   - contas_pagar');
    console.log('   - contas_receber');
    console.log('   - parcelas');
    console.log('   - conta_pagar_tipo_despesa');
    console.log('   - conta_receber_tipo_receita');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Executar migração se o script for chamado diretamente
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('🎉 Migração finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na migração:', error);
      process.exit(1);
    });
}

module.exports = { createTables };