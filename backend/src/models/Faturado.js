const BaseModel = require('./BaseModel');
const { supabase, isSupabaseConfigured, isSupabaseConnected, testSupabaseConnection } = require('../config/supabase');
const { query } = require('../config/database');

class Faturado extends BaseModel {
  constructor() {
    super('faturados');
  }

  static async findAll(ativo = true) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('faturados')
        .select('*')
        .eq('ativo', ativo)
        .order('nome_completo');
      if (error) throw error;
      return data;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        'SELECT * FROM faturados WHERE ativo = $1 ORDER BY nome_completo',
        [ativo]
      );
      return result.rows;
    }

  static async findById(id) {
    const instance = new Faturado();
    return instance.findById(id);
  }

  static async findByCpf(cpf) {
    if (!cpf) return null;
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
        // Testar conectividade se necessário
        if (!isSupabaseConnected) {
          const connected = await testSupabaseConnection();
          if (!connected) {
            console.warn('⚠️  Supabase não conectado, usando fallback local para findByCpf');
            const result = await query(
              'SELECT * FROM faturados WHERE cpf = $1',
              [cpf]
            );
            return result.rows[0];
          }
        }

        const { data, error } = await supabase
          .from('faturados')
          .select('*')
          .eq('cpf', cpf)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          // Se for erro de conectividade, usar fallback
          if (error.message.includes('fetch failed') || error.message.includes('network')) {
            console.warn('⚠️  Erro de rede no Supabase, usando fallback local para findByCpf');
            const result = await query(
              'SELECT * FROM faturados WHERE cpf = $1',
              [cpf]
            );
            return result.rows[0];
          }
          throw error;
        }
        return data;
      } catch (err) {
        // Fallback para banco local em caso de erro
        if (err.message.includes('fetch failed') || err.message.includes('network')) {
          console.warn('⚠️  Erro de conectividade no Supabase, usando fallback local para findByCpf');
          const result = await query(
            'SELECT * FROM faturados WHERE cpf = $1',
            [cpf]
          );
          return result.rows[0];
        }
        throw err;
      }
    } else {
      const result = await query(
        'SELECT * FROM faturados WHERE cpf = $1',
        [cpf]
      );
      return result.rows[0];
    }
  }



  static async search(searchTerm) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
        const { data, error } = await supabase
          .from('faturados')
          .select('*')
          .eq('ativo', true)
          .or(`nome_completo.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`)
          .order('nome_completo');
        
        if (error) {
          if (error.message.includes('fetch failed') || error.message.includes('network')) {
            console.warn('⚠️  Erro de conectividade no Supabase para search, usando fallback local');
            const result = await query(
              `SELECT * FROM faturados 
               WHERE ativo = true AND (
                 nome_completo ILIKE $1 OR 
                 cpf ILIKE $1
               )
               ORDER BY nome_completo`,
              [`%${searchTerm}%`]
            );
            return result.rows;
          }
          throw error;
        }
        return data;
      } catch (err) {
        if (err.message.includes('fetch failed') || err.message.includes('network')) {
          console.warn('⚠️  Erro de conectividade no Supabase para search, usando fallback local');
          const result = await query(
            `SELECT * FROM faturados 
             WHERE ativo = true AND (
               nome_completo ILIKE $1 OR 
               cpf ILIKE $1
             )
             ORDER BY nome_completo`,
            [`%${searchTerm}%`]
          );
          return result.rows;
        }
        throw err;
      }
    } else {
      const result = await query(
        `SELECT * FROM faturados 
         WHERE ativo = true AND (
           nome_completo ILIKE $1 OR 
           cpf ILIKE $1
         )
         ORDER BY nome_completo`,
        [`%${searchTerm}%`]
      );
      return result.rows;
    }
  }

  static async create(faturadoData) {
    const instance = new Faturado();
    return instance.create(faturadoData);
  }

  static async update(id, faturadoData) {
    const instance = new Faturado();
    return instance.update(id, faturadoData);
  }

  static async inactivate(id) {
    const instance = new Faturado();
    return instance.inactivate(id);
  }

  static async reactivate(id) {
    const instance = new Faturado();
    return instance.reactivate(id);
  }
}

module.exports = Faturado;