const BaseModel = require('./BaseModel');
const { supabase, isSupabaseConfigured, isSupabaseConnected, testSupabaseConnection } = require('../config/supabase');
const { query } = require('../config/database');

class Cliente extends BaseModel {
  constructor() {
    super('clientes');
  }

  static async findAll(ativo = true) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('clientes')
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
        'SELECT * FROM clientes WHERE ativo = $1 ORDER BY nome_completo',
        [ativo]
      );
      return result.rows;
    }

  static async findById(id) {
    const instance = new Cliente();
    return instance.findById(id);
  }

  static async findByCpf(cpf) {
    if (!cpf) return null;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('cpf', cpf)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } else {
      const result = await query(
        'SELECT * FROM clientes WHERE cpf = $1',
        [cpf]
      );
      return result.rows[0];
    }
  }

  static async findByCnpj(cnpj) {
    if (!cnpj) return null;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('cnpj', cnpj)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } else {
      const result = await query(
        'SELECT * FROM clientes WHERE cnpj = $1',
        [cnpj]
      );
      return result.rows[0];
    }
  }

  static async search(searchTerm) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true)
        .or(`nome_completo.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%`)
        .order('nome_completo');
      if (error) throw error;
      return data;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        `SELECT * FROM clientes 
         WHERE ativo = true AND (
           nome_completo ILIKE $1 OR 
           cpf ILIKE $1 OR 
           cnpj ILIKE $1
         )
         ORDER BY nome_completo`,
        [`%${searchTerm}%`]
      );
      return result.rows;
    }

  static async create(clienteData) {
    const instance = new Cliente();
    return instance.create(clienteData);
  }

  static async update(id, clienteData) {
    const instance = new Cliente();
    return instance.update(id, clienteData);
  }

  static async inactivate(id) {
    const instance = new Cliente();
    return instance.inactivate(id);
  }

  static async reactivate(id) {
    const instance = new Cliente();
    return instance.reactivate(id);
  }
}

module.exports = Cliente;