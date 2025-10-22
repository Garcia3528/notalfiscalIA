const BaseModel = require('./BaseModel');
const { supabase, isSupabaseConfigured, isSupabaseConnected, testSupabaseConnection } = require('../config/supabase');
const { query } = require('../config/database');

class Fornecedor extends BaseModel {
  constructor() {
    super('fornecedores');
  }
  static async findAll(ativo = true) {
    const instance = new Fornecedor();
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('ativo', ativo)
        .order('razao_social');
      
      if (error) throw error;
      return data;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        'SELECT * FROM fornecedores WHERE ativo = $1 ORDER BY razao_social',
        [ativo]
      );
      return result.rows;
    }

  static async findById(id) {
    const instance = new Fornecedor();
    return instance.findById(id);
  }

  static async findByCnpj(cnpj) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
        // Testar conectividade se necessário
        if (!isSupabaseConnected) {
          const connected = await testSupabaseConnection();
          if (!connected) {
            console.warn('⚠️  Supabase não conectado, usando fallback local para findByCnpj');
            const result = await query(
              'SELECT * FROM fornecedores WHERE cnpj = $1',
              [cnpj]
            );
            return result.rows[0];
          }
        }

        const { data, error } = await supabase
          .from('fornecedores')
          .select('*')
          .eq('cnpj', cnpj)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          // Se for erro de conectividade, usar fallback
          if (error.message.includes('fetch failed') || error.message.includes('network')) {
            console.warn('⚠️  Erro de rede no Supabase, usando fallback local para findByCnpj');
            const result = await query(
              'SELECT * FROM fornecedores WHERE cnpj = $1',
              [cnpj]
            );
            return result.rows[0];
          }
          throw error;
        }
        return data;
      } catch (err) {
        // Fallback para banco local em caso de erro
        if (err.message.includes('fetch failed') || err.message.includes('network')) {
          console.warn('⚠️  Erro de conectividade no Supabase, usando fallback local para findByCnpj');
          const result = await query(
            'SELECT * FROM fornecedores WHERE cnpj = $1',
            [cnpj]
          );
          return result.rows[0];
        }
        throw err;
      }
    } else {
      const result = await query(
        'SELECT * FROM fornecedores WHERE cnpj = $1',
        [cnpj]
      );
      return result.rows[0];
    }
  }

  static async create(fornecedorData) {
    const instance = new Fornecedor();
    return instance.create(fornecedorData);
  }

  static async update(id, fornecedorData) {
    const instance = new Fornecedor();
    return instance.update(id, fornecedorData);
  }

  static async inactivate(id) {
    const instance = new Fornecedor();
    return instance.inactivate(id);
  }

  static async reactivate(id) {
    const instance = new Fornecedor();
    return instance.reactivate(id);
  }

  static async search(searchTerm) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('ativo', true)
        .or(`razao_social.ilike.%${searchTerm}%,nome_fantasia.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%`)
        .order('razao_social');
      
      if (error) throw error;
      return data;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        `SELECT * FROM fornecedores 
         WHERE ativo = true AND (
           razao_social ILIKE $1 OR 
           nome_fantasia ILIKE $1 OR 
           cnpj ILIKE $1
         )
         ORDER BY razao_social`,
        [`%${searchTerm}%`]
      );
      return result.rows;
    }
  }

module.exports = Fornecedor;