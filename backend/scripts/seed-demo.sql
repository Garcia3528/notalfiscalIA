-- Seed de dados demo para Navegabilidade e RAG
-- Execute este script após criar o schema com backend/scripts/supabase-full.sql

-- =============================
-- Fornecedores (60 registros)
-- =============================
INSERT INTO fornecedores (razao_social, nome_fantasia, cnpj, endereco, telefone, email, ativo)
SELECT 
  'Fornecedor ' || gs,
  'Fornecedor ' || gs,
  LPAD(gs::text, 14, '0'),
  'Rua ' || gs || ', Centro',
  '555-' || LPAD(gs::text, 4, '0'),
  'fornecedor' || gs || '@exemplo.com',
  true
FROM generate_series(1, 60) gs
ON CONFLICT (cnpj) DO NOTHING;

-- =============================
-- Faturados (60 registros)
-- =============================
INSERT INTO faturados (nome_completo, cpf, cnpj, endereco, telefone, email, ativo)
SELECT 
  'Faturado ' || gs,
  LPAD(gs::text, 11, '0'),
  LPAD((gs + 1000)::text, 14, '0'),
  'Av. Principal ' || gs,
  '556-' || LPAD(gs::text, 4, '0'),
  'faturado' || gs || '@exemplo.com',
  true
FROM generate_series(1, 60) gs
ON CONFLICT DO NOTHING;

-- =============================
-- Clientes (40 registros)
-- =============================
INSERT INTO clientes (nome_completo, cpf, cnpj, endereco, telefone, email, ativo)
SELECT 
  'Cliente ' || gs,
  LPAD((gs + 2000)::text, 11, '0'),
  LPAD((gs + 3000)::text, 14, '0'),
  'Rua Cliente ' || gs,
  '557-' || LPAD(gs::text, 4, '0'),
  'cliente' || gs || '@exemplo.com',
  true
FROM generate_series(1, 40) gs
ON CONFLICT DO NOTHING;

-- =============================
-- Tipos de Despesa (adiciona 30 registros)
-- =============================
INSERT INTO tipos_despesa (nome, descricao, categoria, ativo)
SELECT 
  'Despesa Demo ' || gs,
  'Despesa gerada para testes ' || gs,
  CASE 
    WHEN gs % 8 = 0 THEN 'ADMINISTRATIVAS'
    WHEN gs % 8 = 1 THEN 'INFRAESTRUTURA E UTILIDADES'
    WHEN gs % 8 = 2 THEN 'INSUMOS AGRÍCOLAS'
    WHEN gs % 8 = 3 THEN 'INVESTIMENTOS'
    WHEN gs % 8 = 4 THEN 'MANUTENÇÃO E OPERAÇÃO'
    WHEN gs % 8 = 5 THEN 'IMPOSTOS E TAXAS'
    WHEN gs % 8 = 6 THEN 'SEGUROS E PROTEÇÃO'
    ELSE 'OUTRAS'
  END,
  true
FROM generate_series(1, 30) gs
ON CONFLICT DO NOTHING;

-- =============================
-- Tipos de Receita (adiciona 20 registros)
-- =============================
INSERT INTO tipos_receita (nome, descricao, categoria, ativo)
SELECT 
  'Receita Demo ' || gs,
  'Receita gerada para testes ' || gs,
  CASE 
    WHEN gs % 6 = 0 THEN 'OPERACIONAL'
    WHEN gs % 6 = 1 THEN 'FINANCEIRA'
    WHEN gs % 6 = 2 THEN 'VENDAS'
    WHEN gs % 6 = 3 THEN 'SERVIÇOS'
    WHEN gs % 6 = 4 THEN 'ALUGUEL'
    ELSE 'OUTRAS'
  END,
  true
FROM generate_series(1, 20) gs
ON CONFLICT DO NOTHING;

-- =============================
-- Contas a Pagar (60 registros)
-- =============================
INSERT INTO contas_pagar (
  numero_nota, fornecedor_id, faturado_id, data_emissao, data_vencimento, valor_total, valor_pago, status, observacoes, ativo
) 
SELECT 
  'NF-P-' || LPAD(gs::text, 6, '0'),
  (SELECT id FROM fornecedores ORDER BY random() LIMIT 1),
  (SELECT id FROM faturados ORDER BY random() LIMIT 1),
  (CURRENT_DATE - ((gs % 180))::int),
  (CURRENT_DATE + ((gs % 60) + 10)::int),
  ROUND((random() * 900 + 100)::numeric, 2),
  0,
  'pendente',
  'Conta a pagar inserida para testes',
  true
FROM generate_series(1, 60) gs;

-- Parcelas para Contas a Pagar (1-3 por conta)
DO $$
DECLARE cp RECORD; n INT; i INT; val NUMERIC; venc DATE;
BEGIN
  FOR cp IN SELECT id, valor_total, data_vencimento FROM contas_pagar ORDER BY created_at DESC LIMIT 60 LOOP
    n := 1 + FLOOR(random() * 3)::INT;
    FOR i IN 1..n LOOP
      val := ROUND(cp.valor_total / n, 2);
      venc := cp.data_vencimento + ((i - 1) * INTERVAL '30 days');
      INSERT INTO parcelas (conta_pagar_id, numero_parcela, valor, data_vencimento, status)
      VALUES (cp.id, i, val, venc, 'pendente')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Vincular Tipos de Despesa (1-2 por conta)
INSERT INTO conta_pagar_tipo_despesa (conta_pagar_id, tipo_despesa_id)
SELECT cp.id, td.id
FROM (
  SELECT id FROM contas_pagar ORDER BY created_at DESC LIMIT 60
) cp
JOIN LATERAL (
  SELECT id FROM tipos_despesa ORDER BY random() LIMIT 2
) td ON true
ON CONFLICT DO NOTHING;

-- =============================
-- Contas a Receber (40 registros)
-- =============================
INSERT INTO contas_receber (
  numero_nota, cliente_id, data_emissao, data_vencimento, valor_total, valor_recebido, status, observacoes, ativo
)
SELECT 
  'NF-R-' || LPAD(gs::text, 6, '0'),
  (SELECT id FROM clientes ORDER BY random() LIMIT 1),
  (CURRENT_DATE - ((gs % 180))::int),
  (CURRENT_DATE + ((gs % 60) + 10)::int),
  ROUND((random() * 1200 + 200)::numeric, 2),
  0,
  'pendente',
  'Conta a receber inserida para testes',
  true
FROM generate_series(1, 40) gs;

-- Parcelas para Contas a Receber (1-3 por conta)
DO $$
DECLARE cr RECORD; n INT; i INT; val NUMERIC; venc DATE;
BEGIN
  FOR cr IN SELECT id, valor_total, data_vencimento FROM contas_receber ORDER BY created_at DESC LIMIT 40 LOOP
    n := 1 + FLOOR(random() * 3)::INT;
    FOR i IN 1..n LOOP
      val := ROUND(cr.valor_total / n, 2);
      venc := cr.data_vencimento + ((i - 1) * INTERVAL '30 days');
      INSERT INTO parcelas_receber (conta_receber_id, numero_parcela, valor, data_vencimento, status)
      VALUES (cr.id, i, val, venc, 'pendente')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Vincular Tipos de Receita (1-2 por conta)
INSERT INTO conta_receber_tipo_receita (conta_receber_id, tipo_receita_id)
SELECT cr.id, tr.id
FROM (
  SELECT id FROM contas_receber ORDER BY created_at DESC LIMIT 40
) cr
JOIN LATERAL (
  SELECT id FROM tipos_receita ORDER BY random() LIMIT 2
) tr ON true
ON CONFLICT DO NOTHING;

-- =============================
-- RAG: inserir 50 chunks de conteúdo (modo simples)
-- Observação: embeddings ficam NULL aqui; use o endpoint /api/rag/index para gerar embeddings com Gemini.
-- =============================
INSERT INTO rag_chunks (title, content, metadata)
SELECT 
  'Documento Demo ' || gs,
  'Este é um conteúdo de teste para o RAG. Contém termos como energia elétrica, manutenção, sementes, impostos e vendas. Texto #' || gs || '.\n\n'
  || 'Use perguntas como: Quais são as despesas mais comuns? ou Qual receita foi maior no período?\n\n'
  || 'Este documento foi gerado automaticamente para validar o fluxo de consulta RAG (modo simples).',
  jsonb_build_object('tag', 'demo', 'idx', gs)
FROM generate_series(1, 50) gs;

-- RAG: adicionar documentos específicos de combustível para cobrir consultas relacionadas
INSERT INTO rag_chunks (title, content, metadata)
SELECT 
  'Guia de contas de combustível ' || gs,
  'Este documento descreve contas de combustível com exemplos práticos de lançamentos e consultas. '
  || 'Inclui termos como contas de combustível, abastecimento, gasolina, diesel, etanol, óleo e lubrificantes. '
  || 'Também aborda notas fiscais de abastecimento, faturas mensais, centros de custo e controle de quilometragem. '
  || 'Perguntas úteis: Quais contas de combustível estão pendentes? Como filtrar despesas de gasolina? '
  || 'Quais lançamentos de diesel em setembro? Como reconciliar faturas de etanol? ',
  jsonb_build_object('tag', 'demo', 'categoria', 'combustivel', 'idx', 1000 + gs)
FROM generate_series(1, 10) gs;

-- =============================
-- Resumo aproximado:
-- 60 fornecedores + 60 faturados + 40 clientes + 30 tipos_despesa + 20 tipos_receita
-- 60 contas_pagar (com parcelas e vínculos) + 40 contas_receber (com parcelas e vínculos)
-- 50 rag_chunks
-- Total > 200 registros, cobrindo navegabilidade e RAG simples.
-- =============================