const BaseModel = require('./BaseModel');
const { supabase, isSupabaseConfigured, isSupabaseConnected, testSupabaseConnection } = require('../config/supabase');
const { query, pool } = require('../config/database');

class ContaReceber extends BaseModel {
  constructor() {
    super('contas_receber');
  }

  static async findAll({ ativo = true, status } = {}) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      let req = supabase.from('contas_receber').select('*');
      if (ativo !== undefined) req = req.eq('ativo', ativo);
      if (status) req = req.eq('status', status);
      // Tenta ordenar por data_vencimento; se a coluna não existir, faz fallback para data_emissao
      let { data, error } = await req.order('data_vencimento', { ascending: true });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('does not exist') || msg.includes('não existe') || msg.includes('unknown column') || msg.includes('column')) {
          // Fallback: tenta novamente ordenando por data_emissao
          const retry = await req.order('data_emissao', { ascending: true });
          if (retry.error) throw retry.error;
          return retry.data;
        }
        throw error;
      }
      return data;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const params = [];
      let sqlBase = 'SELECT * FROM contas_receber WHERE 1=1';
      if (ativo !== undefined) { params.push(ativo); sqlBase += ` AND ativo = $${params.length}`; }
      if (status) { params.push(status); sqlBase += ` AND status = $${params.length}`; }

      // Verifica se a coluna data_vencimento existe; se não, ordena por data_emissao
      const existsRes = await query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'contas_receber' AND column_name = 'data_vencimento'`
      );
      const hasVencimento = existsRes.rowCount > 0;
      const sql = `${sqlBase} ORDER BY ${hasVencimento ? 'data_vencimento' : 'data_emissao'} ASC`;
      const result = await query(sql, params);
      return result.rows;
    }

  static async findById(id) { const instance = new ContaReceber(); return instance.findById(id); }
  static async inactivate(id) { const instance = new ContaReceber(); return instance.inactivate(id); }
  static async reactivate(id) { const instance = new ContaReceber(); return instance.reactivate(id); }
  static async update(id, data) { const instance = new ContaReceber(); return instance.update(id, data); }

  static async findWithParcelas(id) {
    if (isSupabaseConfigured) {
      const { data: conta, error: e1 } = await supabase.from('contas_receber').select('*').eq('id', id).single();
      if (e1) throw e1;
      const { data: parcelas, error: e2 } = await supabase.from('parcelas_receber').select('*').eq('conta_receber_id', id).order('numero_parcela');
      if (e2) throw e2;
      const { data: receitas, error: e3 } = await supabase
        .from('conta_receber_tipo_receita')
        .select('tipo_receita_id')
        .eq('conta_receber_id', id);
      if (e3) throw e3;
      return { ...conta, parcelas, tipos_receita: receitas.map(r => r.tipo_receita_id) };
    } else {
      const contaRes = await query('SELECT * FROM contas_receber WHERE id = $1', [id]);
      const parcelasRes = await query('SELECT * FROM parcelas_receber WHERE conta_receber_id = $1 ORDER BY numero_parcela', [id]);
      const receitasRes = await query('SELECT tipo_receita_id FROM conta_receber_tipo_receita WHERE conta_receber_id = $1', [id]);
      const conta = contaRes.rows[0];
      return { ...conta, parcelas: parcelasRes.rows, tipos_receita: receitasRes.rows.map(r => r.tipo_receita_id) };
    }
  }

  static async create({ conta, parcelas = [], tipos_receita = [] }) {
    if (isSupabaseConfigured) {
      // Inserir conta
      const { data: contaData, error: contaErr } = await supabase.from('contas_receber').insert(conta).select('*').single();
      if (contaErr) throw contaErr;
      const contaId = contaData.id;
      // Inserir parcelas
      if (parcelas.length) {
        const parcelasPayload = parcelas.map(p => ({ ...p, conta_receber_id: contaId }));
        const { error: parErr } = await supabase.from('parcelas_receber').insert(parcelasPayload);
        if (parErr) throw parErr;
      }
      // Inserir relacionamentos de receitas
      if (tipos_receita.length) {
        const relPayload = tipos_receita.map(trId => ({ conta_receber_id: contaId, tipo_receita_id: trId }));
        const { error: relErr } = await supabase.from('conta_receber_tipo_receita').insert(relPayload);
        if (relErr) throw relErr;
      }
      return await ContaReceber.findWithParcelas(contaId);
    } else {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const insertConta = await client.query(
          `INSERT INTO contas_receber (numero_nota, cliente_id, data_emissao, data_vencimento, valor_total, valor_recebido, status, observacoes, arquivo_pdf_path, dados_extraidos, ativo)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          [
            conta.numero_nota || null,
            conta.cliente_id,
            conta.data_emissao,
            conta.data_vencimento,
            conta.valor_total,
            conta.valor_recebido || 0,
            conta.status || 'pendente',
            conta.observacoes || null,
            conta.arquivo_pdf_path || null,
            conta.dados_extraidos || null,
            conta.ativo !== undefined ? conta.ativo : true,
          ]
        );
        const contaId = insertConta.rows[0].id;
        for (const p of parcelas) {
          await client.query(
            `INSERT INTO parcelas_receber (conta_receber_id, numero_parcela, valor, data_vencimento, data_recebimento, valor_recebido, status, observacoes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              contaId,
              p.numero_parcela,
              p.valor,
              p.data_vencimento,
              p.data_recebimento || null,
              p.valor_recebido || 0,
              p.status || 'pendente',
              p.observacoes || null,
            ]
          );
        }
        for (const trId of tipos_receita) {
          await client.query(
            `INSERT INTO conta_receber_tipo_receita (conta_receber_id, tipo_receita_id) VALUES ($1,$2)`,
            [contaId, trId]
          );
        }
        await client.query('COMMIT');
        const result = await query('SELECT * FROM contas_receber WHERE id = $1', [contaId]);
        const parcelasRes = await query('SELECT * FROM parcelas_receber WHERE conta_receber_id = $1 ORDER BY numero_parcela', [contaId]);
        const receitasRes = await query('SELECT tipo_receita_id FROM conta_receber_tipo_receita WHERE conta_receber_id = $1', [contaId]);
        return { ...result.rows[0], parcelas: parcelasRes.rows, tipos_receita: receitasRes.rows.map(r => r.tipo_receita_id) };
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  }
}

module.exports = ContaReceber;