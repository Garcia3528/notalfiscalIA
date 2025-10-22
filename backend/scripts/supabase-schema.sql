-- Script para criar as tabelas no Supabase
-- Execute este script no SQL Editor do Supabase

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    endereco TEXT,
    telefone VARCHAR(20),
    email VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de tipos de despesa
CREATE TABLE IF NOT EXISTS tipos_despesa (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de faturados (pessoas/empresas que recebem a fatura)
CREATE TABLE IF NOT EXISTS faturados (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    cnpj VARCHAR(18),
    endereco TEXT,
    telefone VARCHAR(20),
    email VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de contas a pagar
CREATE TABLE IF NOT EXISTS contas_pagar (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_nota VARCHAR(50),
    fornecedor_id UUID REFERENCES fornecedores(id),
    faturado_id UUID REFERENCES faturados(id),
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    valor_pago DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
    observacoes TEXT,
    arquivo_pdf_path VARCHAR(500),
    dados_extraidos JSONB,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de parcelas
CREATE TABLE IF NOT EXISTS parcelas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conta_pagar_id UUID REFERENCES contas_pagar(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    valor_pago DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir identificação única por conta + número da parcela
ALTER TABLE parcelas
  ADD CONSTRAINT uq_parcelas_conta_numero UNIQUE (conta_pagar_id, numero_parcela);

-- Tabela de relacionamento entre contas a pagar e tipos de despesa
CREATE TABLE IF NOT EXISTS conta_pagar_tipo_despesa (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conta_pagar_id UUID REFERENCES contas_pagar(id) ON DELETE CASCADE,
    tipo_despesa_id UUID REFERENCES tipos_despesa(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores(cnpj);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo);
CREATE INDEX IF NOT EXISTS idx_tipos_despesa_categoria ON tipos_despesa(categoria);
CREATE INDEX IF NOT EXISTS idx_tipos_despesa_ativo ON tipos_despesa(ativo);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor ON contas_pagar(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_data_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_conta_pagar ON parcelas(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);

-- Triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tipos_despesa_updated_at BEFORE UPDATE ON tipos_despesa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faturados_updated_at BEFORE UPDATE ON faturados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contas_pagar_updated_at BEFORE UPDATE ON contas_pagar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parcelas_updated_at BEFORE UPDATE ON parcelas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir alguns tipos de despesa padrão
INSERT INTO tipos_despesa (nome, descricao, categoria) VALUES
('Energia Elétrica', 'Contas de energia elétrica', 'Utilidades'),
('Água e Esgoto', 'Contas de água e esgoto', 'Utilidades'),
('Telefone/Internet', 'Contas de telefone e internet', 'Comunicação'),
('Aluguel', 'Pagamento de aluguel', 'Imobiliário'),
('Material de Escritório', 'Compra de material de escritório', 'Suprimentos'),
('Combustível', 'Abastecimento de veículos', 'Transporte'),
('Manutenção', 'Serviços de manutenção', 'Serviços'),
('Consultoria', 'Serviços de consultoria', 'Serviços'),
('Software/Licenças', 'Licenças de software', 'Tecnologia'),
('Marketing', 'Despesas com marketing e publicidade', 'Marketing')
ON CONFLICT DO NOTHING;

-- Habilitar RLS (Row Level Security) para segurança
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_despesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturados ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_pagar_tipo_despesa ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de RLS (ajuste conforme necessário)
CREATE POLICY "Enable all operations for authenticated users" ON fornecedores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON tipos_despesa FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON faturados FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON contas_pagar FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON parcelas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON conta_pagar_tipo_despesa FOR ALL USING (auth.role() = 'authenticated');

-- =============================
-- NOVAS TABELAS (CLIENTES, RECEITAS, CONTAS A RECEBER)
-- =============================

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    cnpj VARCHAR(18),
    endereco TEXT,
    telefone VARCHAR(20),
    email VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de tipos de receita
CREATE TABLE IF NOT EXISTS tipos_receita (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de contas a receber
CREATE TABLE IF NOT EXISTS contas_receber (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_nota VARCHAR(50),
    cliente_id UUID REFERENCES clientes(id),
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    valor_recebido DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'vencido', 'cancelado')),
    observacoes TEXT,
    arquivo_pdf_path VARCHAR(500),
    dados_extraidos JSONB,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de parcelas de contas a receber
CREATE TABLE IF NOT EXISTS parcelas_receber (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conta_receber_id UUID REFERENCES contas_receber(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    valor_recebido DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'vencido')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir identificação única por conta + número da parcela
ALTER TABLE parcelas_receber
  ADD CONSTRAINT uq_parcelas_receber_conta_numero UNIQUE (conta_receber_id, numero_parcela);

-- Tabela de relacionamento entre contas a receber e tipos de receita
CREATE TABLE IF NOT EXISTS conta_receber_tipo_receita (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conta_receber_id UUID REFERENCES contas_receber(id) ON DELETE CASCADE,
    tipo_receita_id UUID REFERENCES tipos_receita(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
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

-- Triggers updated_at
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tipos_receita_updated_at BEFORE UPDATE ON tipos_receita FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contas_receber_updated_at BEFORE UPDATE ON contas_receber FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parcelas_receber_updated_at BEFORE UPDATE ON parcelas_receber FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_receita ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_receber_tipo_receita ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas
CREATE POLICY "Enable all operations for authenticated users" ON clientes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON tipos_receita FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON contas_receber FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON parcelas_receber FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON conta_receber_tipo_receita FOR ALL USING (auth.role() = 'authenticated');