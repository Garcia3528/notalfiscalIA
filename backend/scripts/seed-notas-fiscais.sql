-- Seed de notas fiscais fictícias para testes da aplicação
-- Execute após criar o schema com backend/scripts/supabase-full.sql
-- Idempotente: usa ON CONFLICT para evitar duplicações

-- =============================
-- Fornecedores
-- =============================
INSERT INTO fornecedores (razao_social, nome_fantasia, cnpj, endereco, telefone, email, ativo)
VALUES
  ('Posto Energia LTDA',       'Posto Energia',       '00000000000001', 'Av. das Nações, 100', '555-1001', 'contato@postoenergia.com',       true),
  ('Energia Sul Distribuição', 'Energia Sul',         '00000000000002', 'Rua das Indústrias, 200', '555-1002', 'faturas@energiasul.com',        true),
  ('Telecom Brasil S/A',       'Telecom Brasil',      '00000000000003', 'Av. Digital, 300',    '555-1003', 'suporte@telecombrasil.com',      true),
  ('Oficina Mecânica Rápida',  'Oficina Rápida',      '00000000000004', 'Rua do Motor, 400',   '555-1004', 'orcamentos@oficinarapida.com',   true),
  ('Serviços Cloud Tech',      'Cloud Tech',          '00000000000005', 'Rua do Data Center, 500', '555-1005', 'financeiro@cloudtech.com',  true)
ON CONFLICT (cnpj) DO NOTHING;

-- =============================
-- Faturados (pessoas/empresas)
-- =============================
INSERT INTO faturados (nome_completo, cpf, cnpj, endereco, telefone, email, ativo)
VALUES
  ('João da Silva', '11111111111', NULL, 'Rua A, 10', '556-2001', 'joao.silva@example.com', true),
  ('Maria Oliveira', '22222222222', NULL, 'Rua B, 20', '556-2002', 'maria.oliveira@example.com', true),
  ('Empresa ABC Ltda', NULL, '33333333333333', 'Av. Empresarial, 30', '556-2003', 'contato@empresaabc.com', true)
ON CONFLICT DO NOTHING;

-- =============================
-- Clientes
-- =============================
INSERT INTO clientes (nome_completo, cpf, cnpj, endereco, telefone, email, ativo)
VALUES
  ('Fazenda Sol Nascente', NULL, '44444444444444', 'Estrada Rural, km 12', '557-3001', 'contato@fazendasol.com', true),
  ('Loja Horizonte', NULL, '55555555555555', 'Centro Comercial, 45', '557-3002', 'vendas@lojahorizonte.com', true)
ON CONFLICT DO NOTHING;

-- =============================
-- Tipos de Despesa
-- =============================
INSERT INTO tipos_despesa (nome, descricao, categoria, ativo)
VALUES
  ('Combustível', 'Despesas de abastecimento de veículos (gasolina, diesel, etanol)', 'INFRAESTRUTURA E UTILIDADES', true),
  ('Energia Elétrica', 'Faturas de energia das unidades/galpões', 'INFRAESTRUTURA E UTILIDADES', true),
  ('Internet e Telefonia', 'Serviços de internet e telefonia móvel', 'INFRAESTRUTURA E UTILIDADES', true),
  ('Manutenção de Veículos', 'Serviços mecânicos, troca de óleo, peças', 'MANUTENÇÃO E OPERAÇÃO', true),
  ('Serviços Cloud', 'Infraestrutura e serviços em nuvem', 'TECNOLOGIA', true)
ON CONFLICT DO NOTHING;

-- =============================
-- Tipos de Receita
-- =============================
INSERT INTO tipos_receita (nome, descricao, categoria, ativo)
VALUES
  ('Venda de Produtos', 'Receitas de venda de produtos próprios', 'VENDAS', true),
  ('Serviços', 'Receitas por prestação de serviços', 'SERVIÇOS', true),
  ('Aluguel de Máquinas', 'Receitas de locação de equipamentos', 'OPERACIONAL', true)
ON CONFLICT DO NOTHING;

-- =============================
-- Contas a Pagar (notas fictícias)
-- =============================
WITH notas AS (
  SELECT * FROM (
    VALUES
      ('NF-P-000101', 'Posto Energia',       1,  680.50, 15, 30, 'Abastecimento de diesel caminhão'),
      ('NF-P-000102', 'Energia Sul',         1, 1200.00, 20, 35, 'Fatura de energia elétrica - unidade 1'),
      ('NF-P-000103', 'Telecom Brasil',      1,  240.90, 25, 40, 'Internet fibra + telefone corporativo'),
      ('NF-P-000104', 'Oficina Rápida',      2, 2100.00, 10, 40, 'Revisão completa + troca de óleo'),
      ('NF-P-000105', 'Cloud Tech',          3, 1500.00,  5, 40, 'Serviços cloud mensais'),
      ('NF-P-000106', 'Posto Energia',       1,  320.00,  3, 30, 'Gasolina frota leve'),
      ('NF-P-000107', 'Energia Sul',         1,  980.70, 12, 34, 'Fatura de energia elétrica - unidade 2'),
      ('NF-P-000108', 'Telecom Brasil',      1,  189.99, 18, 30, 'Telefonia móvel plano corporativo'),
      ('NF-P-000109', 'Oficina Rápida',      1,  890.00, 14, 30, 'Troca de pneus e alinhamento'),
      ('NF-P-000110', 'Posto Energia',       2,  950.00, 28, 45, 'Abastecimento etanol + diesel')
  ) AS t(numero_nota, fornecedor_nome, parcelas, valor_base, dias_emissao, dias_venc, observacoes)
)
INSERT INTO contas_pagar (
  numero_nota, fornecedor_id, faturado_id, data_emissao, data_vencimento, valor_total, valor_pago, status, observacoes, ativo
)
SELECT 
  n.numero_nota,
  (SELECT id FROM fornecedores f WHERE f.nome_fantasia = n.fornecedor_nome LIMIT 1),
  (SELECT id FROM faturados ORDER BY random() LIMIT 1),
  (CURRENT_DATE - n.dias_emissao)::date,
  (CURRENT_DATE + n.dias_venc)::date,
  ROUND((n.valor_base + (random() * 100))::numeric, 2),
  0,
  'pendente',
  n.observacoes,
  true
FROM notas n
ON CONFLICT DO NOTHING;

-- Parcelas para Contas a Pagar conforme quantidade definida em "notas"
DO $$
DECLARE c RECORD; i INT; total NUMERIC; valor NUMERIC; primeiro_venc DATE;
BEGIN
  FOR c IN 
    SELECT cp.id, cp.valor_total, cp.data_vencimento, n.parcelas
    FROM contas_pagar cp
    JOIN (
      SELECT numero_nota, parcelas FROM (
        VALUES
          ('NF-P-000101', 1), ('NF-P-000102', 1), ('NF-P-000103', 1), ('NF-P-000104', 2),
          ('NF-P-000105', 3), ('NF-P-000106', 1), ('NF-P-000107', 1), ('NF-P-000108', 1),
          ('NF-P-000109', 1), ('NF-P-000110', 2)
      ) AS x(numero_nota, parcelas)
    ) n ON n.numero_nota = cp.numero_nota
  LOOP
    total := c.valor_total; primeiro_venc := c.data_vencimento;
    FOR i IN 1..GREATEST(c.parcelas, 1) LOOP
      valor := ROUND(total / GREATEST(c.parcelas, 1), 2);
      INSERT INTO parcelas (conta_pagar_id, numero_parcela, valor, data_vencimento, status)
      VALUES (c.id, i, valor, (primeiro_venc + ((i - 1) * INTERVAL '30 days'))::date, 'pendente')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Vincular Tipos de Despesa principais
INSERT INTO conta_pagar_tipo_despesa (conta_pagar_id, tipo_despesa_id)
SELECT cp.id,
  CASE
    WHEN f.nome_fantasia = 'Posto Energia'      THEN (SELECT id FROM tipos_despesa WHERE nome = 'Combustível' LIMIT 1)
    WHEN f.nome_fantasia = 'Energia Sul'        THEN (SELECT id FROM tipos_despesa WHERE nome = 'Energia Elétrica' LIMIT 1)
    WHEN f.nome_fantasia = 'Telecom Brasil'     THEN (SELECT id FROM tipos_despesa WHERE nome = 'Internet e Telefonia' LIMIT 1)
    WHEN f.nome_fantasia = 'Oficina Rápida'     THEN (SELECT id FROM tipos_despesa WHERE nome = 'Manutenção de Veículos' LIMIT 1)
    WHEN f.nome_fantasia = 'Cloud Tech'         THEN (SELECT id FROM tipos_despesa WHERE nome = 'Serviços Cloud' LIMIT 1)
    ELSE (SELECT id FROM tipos_despesa ORDER BY random() LIMIT 1)
  END
FROM contas_pagar cp
JOIN fornecedores f ON f.id = cp.fornecedor_id
ON CONFLICT DO NOTHING;

-- =============================
-- Contas a Receber (notas fictícias)
-- =============================
WITH vendas AS (
  SELECT * FROM (
    VALUES
      ('NF-R-000201', 'Fazenda Sol Nascente', 2,  5600.00, 20, 35, 'Venda de insumos agrícolas'),
      ('NF-R-000202', 'Loja Horizonte',       1,  2300.00, 15, 30, 'Prestação de serviços técnicos'),
      ('NF-R-000203', 'Fazenda Sol Nascente', 3,  7200.00, 10, 40, 'Venda de sementes e fertilizantes'),
      ('NF-R-000204', 'Loja Horizonte',       1,  1800.00, 12, 28, 'Locação de equipamentos'),
      ('NF-R-000205', 'Fazenda Sol Nascente', 1,  2900.00,  7, 25, 'Serviços de consultoria')
  ) AS t(numero_nota, cliente_nome, parcelas, valor_base, dias_emissao, dias_venc, observacoes)
)
INSERT INTO contas_receber (
  numero_nota, cliente_id, data_emissao, data_vencimento, valor_total, valor_recebido, status, observacoes, ativo
)
SELECT 
  v.numero_nota,
  (SELECT id FROM clientes c WHERE c.nome_completo = v.cliente_nome LIMIT 1),
  (CURRENT_DATE - v.dias_emissao)::date,
  (CURRENT_DATE + v.dias_venc)::date,
  ROUND((v.valor_base + (random() * 200))::numeric, 2),
  0,
  'pendente',
  v.observacoes,
  true
FROM vendas v
ON CONFLICT DO NOTHING;

-- Parcelas para Contas a Receber
DO $$
DECLARE c RECORD; i INT; total NUMERIC; valor NUMERIC; primeiro_venc DATE;
BEGIN
  FOR c IN 
    SELECT cr.id, cr.valor_total, cr.data_vencimento, v.parcelas
    FROM contas_receber cr
    JOIN (
      SELECT numero_nota, parcelas FROM (
        VALUES
          ('NF-R-000201', 2), ('NF-R-000202', 1), ('NF-R-000203', 3), ('NF-R-000204', 1), ('NF-R-000205', 1)
      ) AS x(numero_nota, parcelas)
    ) v ON v.numero_nota = cr.numero_nota
  LOOP
    total := c.valor_total; primeiro_venc := c.data_vencimento;
    FOR i IN 1..GREATEST(c.parcelas, 1) LOOP
      valor := ROUND(total / GREATEST(c.parcelas, 1), 2);
      INSERT INTO parcelas_receber (conta_receber_id, numero_parcela, valor, data_vencimento, status)
      VALUES (c.id, i, valor, (primeiro_venc + ((i - 1) * INTERVAL '30 days'))::date, 'pendente')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Vincular Tipos de Receita
INSERT INTO conta_receber_tipo_receita (conta_receber_id, tipo_receita_id)
SELECT cr.id,
  CASE
    WHEN cr.observacoes ILIKE '%venda%' THEN (SELECT id FROM tipos_receita WHERE nome = 'Venda de Produtos' LIMIT 1)
    WHEN cr.observacoes ILIKE '%servi%' THEN (SELECT id FROM tipos_receita WHERE nome = 'Serviços' LIMIT 1)
    WHEN cr.observacoes ILIKE '%loca%'  THEN (SELECT id FROM tipos_receita WHERE nome = 'Aluguel de Máquinas' LIMIT 1)
    ELSE (SELECT id FROM tipos_receita ORDER BY random() LIMIT 1)
  END
FROM contas_receber cr
ON CONFLICT DO NOTHING;

-- =============================
-- Fim do seed
-- =============================