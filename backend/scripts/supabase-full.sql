-- Supabase Schema Completo do Sistema NotaFiscal
-- Execute este script no SQL Editor do Supabase (Project > SQL)

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função de trigger para atualizar coluna updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- =============================
-- ENTIDADES BÁSICAS
-- =============================

-- Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Faturados (quem consta na fatura)
CREATE TABLE IF NOT EXISTS faturados (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  cpf VARCHAR(14),
  cnpj VARCHAR(18),
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_faturados_cpf UNIQUE (cpf),
  CONSTRAINT uq_faturados_cnpj UNIQUE (cnpj)
);

-- Tipos de Despesa
CREATE TABLE IF NOT EXISTS tipos_despesa (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================
-- CONTAS A PAGAR
-- =============================
CREATE TABLE IF NOT EXISTS contas_pagar (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero_nota VARCHAR(50),
  fornecedor_id UUID REFERENCES fornecedores(id),
  faturado_id UUID REFERENCES faturados(id),
  data_emissao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_pago DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido','cancelado')),
  observacoes TEXT,
  arquivo_pdf_path VARCHAR(500),
  dados_extraidos JSONB,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parcelas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conta_pagar_id UUID REFERENCES contas_pagar(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_pago DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_parcelas_conta_numero UNIQUE (conta_pagar_id, numero_parcela)
);

CREATE TABLE IF NOT EXISTS conta_pagar_tipo_despesa (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conta_pagar_id UUID REFERENCES contas_pagar(id) ON DELETE CASCADE,
  tipo_despesa_id UUID REFERENCES tipos_despesa(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_conta_pagar_tipo_despesa UNIQUE (conta_pagar_id, tipo_despesa_id)
);

-- =============================
-- CLIENTES, RECEITAS E CONTAS A RECEBER
-- =============================

CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  cpf VARCHAR(14),
  cnpj VARCHAR(18),
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_clientes_cpf UNIQUE (cpf),
  CONSTRAINT uq_clientes_cnpj UNIQUE (cnpj)
);

CREATE TABLE IF NOT EXISTS tipos_receita (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contas_receber (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero_nota VARCHAR(50),
  cliente_id UUID REFERENCES clientes(id),
  data_emissao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_recebido DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente','recebido','vencido','cancelado')),
  observacoes TEXT,
  arquivo_pdf_path VARCHAR(500),
  dados_extraidos JSONB,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parcelas_receber (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conta_receber_id UUID REFERENCES contas_receber(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  valor_recebido DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente','recebido','vencido')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_parcelas_receber_conta_numero UNIQUE (conta_receber_id, numero_parcela)
);

CREATE TABLE IF NOT EXISTS conta_receber_tipo_receita (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conta_receber_id UUID REFERENCES contas_receber(id) ON DELETE CASCADE,
  tipo_receita_id UUID REFERENCES tipos_receita(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_conta_receber_tipo_receita UNIQUE (conta_receber_id, tipo_receita_id)
);

-- =============================
-- FEEDBACK DE CLASSIFICAÇÃO (Treinamento)
-- =============================
CREATE TABLE IF NOT EXISTS classificacao_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dados_extraidos JSONB NOT NULL,
  texto_analise TEXT,
  categoria_original VARCHAR(100) NOT NULL,
  categoria_correta VARCHAR(100) NOT NULL,
  correto BOOLEAN NOT NULL,
  comentario TEXT,
  confianca_usuario NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================
-- ÍNDICES
-- =============================
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores(cnpj);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo);
CREATE INDEX IF NOT EXISTS idx_faturados_cpf ON faturados(cpf);
CREATE INDEX IF NOT EXISTS idx_faturados_cnpj ON faturados(cnpj);
CREATE INDEX IF NOT EXISTS idx_tipos_despesa_categoria ON tipos_despesa(categoria);
CREATE INDEX IF NOT EXISTS idx_tipos_despesa_ativo ON tipos_despesa(ativo);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor ON contas_pagar(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_conta_pagar ON parcelas(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes(ativo);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes(cnpj);
CREATE INDEX IF NOT EXISTS idx_tipos_receita_categoria ON tipos_receita(categoria);
CREATE INDEX IF NOT EXISTS idx_tipos_receita_ativo ON tipos_receita(ativo);
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente ON contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_receber_conta ON parcelas_receber(conta_receber_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_receber_status ON parcelas_receber(status);
CREATE INDEX IF NOT EXISTS idx_classificacao_feedback_categoria ON classificacao_feedback(categoria_correta);

-- Índice GIN opcional para consultas em dados_extraidos
CREATE INDEX IF NOT EXISTS idx_contas_pagar_dados_extraidos_gin ON contas_pagar USING GIN (dados_extraidos);
CREATE INDEX IF NOT EXISTS idx_contas_receber_dados_extraidos_gin ON contas_receber USING GIN (dados_extraidos);
CREATE INDEX IF NOT EXISTS idx_feedback_dados_extraidos_gin ON classificacao_feedback USING GIN (dados_extraidos);

-- TRIGGERS updated_at
-- =============================
-- Torna idempotente para evitar erros ao reexecutar o script
DROP TRIGGER IF EXISTS update_fornecedores_updated_at ON fornecedores;
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_faturados_updated_at ON faturados;
CREATE TRIGGER update_faturados_updated_at BEFORE UPDATE ON faturados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tipos_despesa_updated_at ON tipos_despesa;
CREATE TRIGGER update_tipos_despesa_updated_at BEFORE UPDATE ON tipos_despesa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contas_pagar_updated_at ON contas_pagar;
CREATE TRIGGER update_contas_pagar_updated_at BEFORE UPDATE ON contas_pagar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parcelas_updated_at ON parcelas;
CREATE TRIGGER update_parcelas_updated_at BEFORE UPDATE ON parcelas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tipos_receita_updated_at ON tipos_receita;
CREATE TRIGGER update_tipos_receita_updated_at BEFORE UPDATE ON tipos_receita FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contas_receber_updated_at ON contas_receber;
CREATE TRIGGER update_contas_receber_updated_at BEFORE UPDATE ON contas_receber FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parcelas_receber_updated_at ON parcelas_receber;
CREATE TRIGGER update_parcelas_receber_updated_at BEFORE UPDATE ON parcelas_receber FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_classificacao_feedback_updated_at ON classificacao_feedback;
CREATE TRIGGER update_classificacao_feedback_updated_at BEFORE UPDATE ON classificacao_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================
-- RLS (Row Level Security)
-- =============================
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturados ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_despesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_pagar_tipo_despesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_receita ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_receber_tipo_receita ENABLE ROW LEVEL SECURITY;
ALTER TABLE classificacao_feedback ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajuste conforme necessidade de segurança)
DROP POLICY IF EXISTS "authenticated_all_fornecedores" ON fornecedores;
CREATE POLICY "authenticated_all_fornecedores" ON fornecedores
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_faturados" ON faturados;
CREATE POLICY "authenticated_all_faturados" ON faturados
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_tipos_despesa" ON tipos_despesa;
CREATE POLICY "authenticated_all_tipos_despesa" ON tipos_despesa
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_contas_pagar" ON contas_pagar;
CREATE POLICY "authenticated_all_contas_pagar" ON contas_pagar
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_parcelas" ON parcelas;
CREATE POLICY "authenticated_all_parcelas" ON parcelas
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_conta_pagar_tipo_despesa" ON conta_pagar_tipo_despesa;
CREATE POLICY "authenticated_all_conta_pagar_tipo_despesa" ON conta_pagar_tipo_despesa
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_clientes" ON clientes;
CREATE POLICY "authenticated_all_clientes" ON clientes
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_tipos_receita" ON tipos_receita;
CREATE POLICY "authenticated_all_tipos_receita" ON tipos_receita
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_contas_receber" ON contas_receber;
CREATE POLICY "authenticated_all_contas_receber" ON contas_receber
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_parcelas_receber" ON parcelas_receber;
CREATE POLICY "authenticated_all_parcelas_receber" ON parcelas_receber
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_conta_receber_tipo_receita" ON conta_receber_tipo_receita;
CREATE POLICY "authenticated_all_conta_receber_tipo_receita" ON conta_receber_tipo_receita
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_classificacao_feedback" ON classificacao_feedback;
CREATE POLICY "authenticated_all_classificacao_feedback" ON classificacao_feedback
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================
-- SEEDS BÁSICOS
-- =============================
INSERT INTO tipos_despesa (nome, descricao, categoria) VALUES
  ('Energia Elétrica', 'Contas de energia elétrica', 'INFRAESTRUTURA E UTILIDADES'),
  ('Água e Esgoto', 'Contas de água e esgoto', 'INFRAESTRUTURA E UTILIDADES'),
  ('Telefone/Internet', 'Contas de telefone e internet', 'INFRAESTRUTURA E UTILIDADES'),
  ('Aluguel', 'Pagamento de aluguel', 'INVESTIMENTOS'),
  ('Material de Escritório', 'Compra de material de escritório', 'OUTRAS'),
  ('Combustível', 'Abastecimento de veículos', 'MANUTENÇÃO E OPERAÇÃO'),
  ('Manutenção', 'Serviços de manutenção', 'MANUTENÇÃO E OPERAÇÃO'),
  ('Consultoria', 'Serviços de consultoria', 'ADMINISTRATIVAS'),
  ('Software/Licenças', 'Licenças de software', 'OUTRAS'),
  ('Marketing', 'Despesas com marketing e publicidade', 'OUTRAS')
ON CONFLICT DO NOTHING;

-- =============================
-- RAG (Retrieval-Augmented Generation)
-- =============================

-- Extensão pgvector para armazenar embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela de chunks indexados para RAG
CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice de similaridade para embeddings (cosine)
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_ivfflat ON rag_chunks USING ivfflat (embedding vector_cosine_ops);

-- Habilitar RLS
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

-- Política ampla para ambiente autenticado (ajuste conforme segurança desejada)
DROP POLICY IF EXISTS "authenticated_all_rag_chunks" ON rag_chunks;
CREATE POLICY "authenticated_all_rag_chunks" ON rag_chunks
AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Função RPC para busca semântica por embeddings
CREATE OR REPLACE FUNCTION match_rag_chunks(
  query_embedding vector(768),
  match_count int DEFAULT 8,
  similarity_threshold float DEFAULT 0.2
)
RETURNS TABLE(
  id uuid,
  title text,
  content text,
  metadata jsonb,
  score float
) AS $$
  SELECT c.id, c.title, c.content, c.metadata,
         (1 - (c.embedding <=> query_embedding)) AS score
  FROM rag_chunks c
  WHERE (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE PARALLEL SAFE;