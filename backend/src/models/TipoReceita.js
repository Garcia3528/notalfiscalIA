const BaseModel = require('./BaseModel');
const { supabase, isSupabaseConfigured, isSupabaseConnected, testSupabaseConnection } = require('../config/supabase');
const { query } = require('../config/database');

class TipoReceita extends BaseModel {
  constructor() {
    super('tipos_receita');
  }

  static async findAll(ativo = true) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('tipos_receita')
        .select('*')
        .eq('ativo', ativo)
        .order('categoria')
        .order('nome');
      if (error) throw error;
      return data;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        'SELECT * FROM tipos_receita WHERE ativo = $1 ORDER BY categoria, nome',
        [ativo]
      );
      return result.rows;
    }

  static async findById(id) {
    const instance = new TipoReceita();
    return instance.findById(id);
  }

  static async findByCategoria(categoria) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('tipos_receita')
        .select('*')
        .eq('categoria', categoria)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        'SELECT * FROM tipos_receita WHERE categoria = $1 AND ativo = true ORDER BY nome',
        [categoria]
      );
      return result.rows;
    }

  static async findByNome(nome) {
    if (!nome) return null;
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('tipos_receita')
        .select('*')
        .ilike('nome', nome)
        .eq('ativo', true)
        .limit(1);
      if (error) throw error;
      return data[0] || null;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        'SELECT * FROM tipos_receita WHERE ativo = true AND LOWER(nome) = LOWER($1) LIMIT 1',
        [nome]
      );
      return result.rows[0] || null;
    }

  static async create(tipoReceitaData) {
    const instance = new TipoReceita();
    return instance.create(tipoReceitaData);
  }

  static async update(id, tipoReceitaData) {
    const instance = new TipoReceita();
    return instance.update(id, tipoReceitaData);
  }

  static async inactivate(id) {
    const instance = new TipoReceita();
    return instance.inactivate(id);
  }

  static async reactivate(id) {
    const instance = new TipoReceita();
    return instance.reactivate(id);
  }
}

module.exports = TipoReceita;