const BaseModel = require('./BaseModel');
const { supabase, isSupabaseConfigured, isSupabaseConnected, testSupabaseConnection } = require('../config/supabase');
const { query, pool } = require('../config/database');

class ContaPagar extends BaseModel {
  constructor() {
    super('contas_pagar');
  }
  static async findAll(ativo = true) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('contas_pagar')
        .select(`
          *,
          fornecedores:fornecedor_id (
            razao_social,
            nome_fantasia
          ),
          faturados:faturado_id (
            nome_completo
          )
        `)
        .eq('ativo', ativo)
        .order('data_emissao', { ascending: false });
      
      if (error) throw error;
      
      // Transformar para manter compatibilidade com o formato anterior
      return data.map(item => ({
        ...item,
        fornecedor_razao_social: item.fornecedores?.razao_social,
        fornecedor_nome_fantasia: item.fornecedores?.nome_fantasia,
        faturado_nome: item.faturados?.nome_completo
      }));
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        `SELECT cp.*, 
                f.razao_social as fornecedor_razao_social,
                f.nome_fantasia as fornecedor_nome_fantasia,
                ft.nome_completo as faturado_nome
         FROM contas_pagar cp
         LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
         LEFT JOIN faturados ft ON cp.faturado_id = ft.id
         WHERE cp.ativo = $1 
         ORDER BY cp.data_emissao DESC`,
        [ativo]
      );
      return result.rows;
    }

  static async findById(id) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
        const { data, error } = await supabase
          .from('contas_pagar')
          .select(`
            *,
            fornecedores:fornecedor_id ( razao_social, nome_fantasia, cnpj ),
            faturados:faturado_id ( nome_completo, cpf, cnpj )
          `)
          .eq('id', id)
          .single();
        if (error) throw error;
        return {
          ...data,
          fornecedor_razao_social: data.fornecedores?.razao_social,
        fornecedor_nome_fantasia: data.fornecedores?.nome_fantasia,
        fornecedor_cnpj: data.fornecedores?.cnpj,
        faturado_nome: data.faturados?.nome_completo,
        faturado_cpf: data.faturados?.cpf,
      };
      } catch (error) {
        if (error.message && (error.message.includes('fetch failed') || error.message.includes('network'))) {
          console.log('Erro de conectividade no Supabase, usando fallback local:', error.message);
          // Fallback para PostgreSQL se Supabase falhar
        } else {
          throw error;
        }
      }
    }
    const result = await query(
      `SELECT cp.*, 
              f.razao_social as fornecedor_razao_social,
              f.nome_fantasia as fornecedor_nome_fantasia,
              f.cnpj as fornecedor_cnpj,
              ft.nome_completo as faturado_nome,
              ft.cpf as faturado_cpf
       FROM contas_pagar cp
       LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
       LEFT JOIN faturados ft ON cp.faturado_id = ft.id
       WHERE cp.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findWithParcelas(id) {
    if (false && isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      // Buscar conta diretamente no Supabase
      const { data: conta, error: contaErr } = await supabase
        .from('contas_pagar')
        .select(`
          *,
          fornecedores(nome_fantasia),
          faturados(nome_completo)
        `)
        .eq('id', id)
        .single();
      if (contaErr || !conta) return null;
      const { data: parcelas, error: ePar } = await supabase
        .from('parcelas')
        .select('*')
        .eq('conta_pagar_id', id)
        .order('numero_parcela');
      if (ePar) throw ePar;
      const { data: tiposLink, error: eTipos } = await supabase
        .from('conta_pagar_tipo_despesa')
        .select('tipo_despesa_id')
        .eq('conta_pagar_id', id);
      if (eTipos) throw eTipos;
      return {
        ...conta,
        parcelas,
        tipos_despesa: tiposLink.map(t => t.tipo_despesa_id)
      };
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }

    // Buscar conta diretamente no PostgreSQL
    const contaResult = await query(
      `SELECT cp.*, f.nome_fantasia as fornecedor_nome, ft.nome_completo as faturado_nome
       FROM contas_pagar cp
       LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
       LEFT JOIN faturados ft ON cp.faturado_id = ft.id
       WHERE cp.id = $1`,
      [id]
    );
    
    if (contaResult.rows.length === 0) return null;
    const conta = contaResult.rows[0];

    const parcelas = await query(
      `SELECT * FROM parcelas 
       WHERE conta_pagar_id = $1 
       ORDER BY numero_parcela`,
      [id]
    );

    const tiposDespesa = await query(
      `SELECT td.* FROM tipos_despesa td
       JOIN conta_pagar_tipo_despesa cptd ON td.id = cptd.tipo_despesa_id
       WHERE cptd.conta_pagar_id = $1`,
      [id]
    );

    return {
      ...conta,
      parcelas: parcelas.rows,
      tipos_despesa: tiposDespesa.rows
    };
  }

  static async create(contaData, parcelasData = [], tiposDespesaIds = []) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const contaPayload = {
        fornecedor_id: contaData.fornecedor_id || null,
        faturado_id: contaData.faturado_id || null,
        numero_nota: contaData.numero_nota_fiscal || contaData.numero_nota || null,
        data_emissao: contaData.data_emissao,
        data_vencimento: parcelasData[0]?.data_vencimento || contaData.data_vencimento || contaData.data_emissao,
        valor_total: contaData.valor_total,
        observacoes: contaData.observacoes || null,
        arquivo_pdf_path: contaData.arquivo_pdf_path || null,
        dados_extraidos: contaData.dados_extraidos_json || contaData.dados_extraidos || null,
      };

      const { data: contaRes, error: contaErr } = await supabase
        .from('contas_pagar')
        .insert(contaPayload)
        .select('*')
        .single();
      if (contaErr) throw contaErr;
      const contaId = contaRes.id;

      if (parcelasData.length > 0) {
        const parcelasPayload = parcelasData.map(p => ({
          conta_pagar_id: contaId,
          numero_parcela: p.numero_parcela,
          data_vencimento: p.data_vencimento,
          valor: p.valor,
        }));
        const { error: parErr } = await supabase.from('parcelas').insert(parcelasPayload);
        if (parErr) throw parErr;
      } else {
        const { error: parErr } = await supabase.from('parcelas').insert({
          conta_pagar_id: contaId,
          numero_parcela: 1,
          data_vencimento: contaPayload.data_vencimento,
          valor: contaPayload.valor_total,
        });
        if (parErr) throw parErr;
      }

      for (const tipoDespesaId of tiposDespesaIds) {
        const { error: linkErr } = await supabase
          .from('conta_pagar_tipo_despesa')
          .insert({ conta_pagar_id: contaId, tipo_despesa_id: tipoDespesaId });
        if (linkErr) throw linkErr;
      }

      return await this.findWithParcelas(contaId);
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        fornecedor_id,
        faturado_id,
        numero_nota_fiscal,
        data_emissao,
        descricao_produtos,
        valor_total,
        observacoes,
        arquivo_pdf_path,
        dados_extraidos_json
      } = contaData;

      const contaResult = await client.query(
        `INSERT INTO contas_pagar 
         (fornecedor_id, faturado_id, numero_nota_fiscal, data_emissao, 
          descricao_produtos, valor_total, observacoes, arquivo_pdf_path, dados_extraidos_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [fornecedor_id, faturado_id, numero_nota_fiscal, data_emissao,
         descricao_produtos, valor_total, observacoes, arquivo_pdf_path, dados_extraidos_json]
      );

      const conta = contaResult.rows[0];

      if (parcelasData.length > 0) {
        for (const parcela of parcelasData) {
          await client.query(
            `INSERT INTO parcelas 
             (conta_pagar_id, numero_parcela, data_vencimento, valor)
             VALUES ($1, $2, $3, $4)`,
            [conta.id, parcela.numero_parcela, parcela.data_vencimento, parcela.valor]
          );
        }
      } else {
        await client.query(
          `INSERT INTO parcelas 
           (conta_pagar_id, numero_parcela, data_vencimento, valor)
           VALUES ($1, 1, $2, $3)`,
          [conta.id, data_emissao, valor_total]
        );
      }

      for (const tipoDespesaId of tiposDespesaIds) {
        await client.query(
          `INSERT INTO conta_pagar_tipo_despesa (conta_pagar_id, tipo_despesa_id)
           VALUES ($1, $2)`,
          [conta.id, tipoDespesaId]
        );
      }

      await client.query('COMMIT');
      return await this.findWithParcelas(conta.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, contaData) {
    const {
      fornecedor_id,
      faturado_id,
      numero_nota_fiscal,
      data_emissao,
      descricao_produtos,
      valor_total,
      observacoes
    } = contaData;

    const result = await query(
      `UPDATE contas_pagar 
       SET fornecedor_id = $1, faturado_id = $2, numero_nota_fiscal = $3,
           data_emissao = $4, descricao_produtos = $5, valor_total = $6,
           observacoes = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND ativo = true
       RETURNING *`,
      [fornecedor_id, faturado_id, numero_nota_fiscal, data_emissao,
       descricao_produtos, valor_total, observacoes, id]
    );
    return result.rows[0];
  }

  static async inactivate(id) {
    const result = await query(
      `UPDATE contas_pagar 
       SET ativo = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async reactivate(id) {
    const result = await query(
      `UPDATE contas_pagar 
       SET ativo = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async findByFornecedor(fornecedorId) {
    const result = await query(
      `SELECT cp.*, f.razao_social as fornecedor_razao_social
       FROM contas_pagar cp
       JOIN fornecedores f ON cp.fornecedor_id = f.id
       WHERE cp.fornecedor_id = $1 AND cp.ativo = true
       ORDER BY cp.data_emissao DESC`,
      [fornecedorId]
    );
    return result.rows;
  }

  static async findByPeriodo(dataInicio, dataFim) {
    const result = await query(
      `SELECT cp.*, 
              f.razao_social as fornecedor_razao_social,
              ft.nome_completo as faturado_nome
       FROM contas_pagar cp
       LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
       LEFT JOIN faturados ft ON cp.faturado_id = ft.id
       WHERE cp.data_emissao BETWEEN $1 AND $2 AND cp.ativo = true
       ORDER BY cp.data_emissao DESC`,
      [dataInicio, dataFim]
    );
    return result.rows;
  }

  static async getResumoFinanceiro() {
    const result = await query(
      `SELECT 
         COUNT(*) as total_contas,
         SUM(valor_total) as valor_total,
         SUM(CASE WHEN EXISTS (
           SELECT 1 FROM parcelas p 
           WHERE p.conta_pagar_id = cp.id AND p.status = 'pago'
         ) THEN valor_total ELSE 0 END) as valor_pago,
         SUM(CASE WHEN EXISTS (
           SELECT 1 FROM parcelas p 
           WHERE p.conta_pagar_id = cp.id AND p.status = 'pendente'
         ) THEN valor_total ELSE 0 END) as valor_pendente
       FROM contas_pagar cp
       WHERE cp.ativo = true`
    );
    return result.rows[0];
  }
}

module.exports = ContaPagar;