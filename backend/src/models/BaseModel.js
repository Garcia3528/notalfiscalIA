const { supabase, isSupabaseConfigured, isSupabaseConnected, testSupabaseConnection } = require('../config/supabase');
const { query } = require('../config/database');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.useSupabase = isSupabaseConfigured;
  }

  // Método para executar queries - usa Supabase se configurado, senão usa PostgreSQL local
  async executeQuery(sqlQuery, params = []) {
    if (this.useSupabase) {
      // Para Supabase, convertemos a query SQL para métodos do cliente
      console.log('⚠️  Query SQL detectada com Supabase. Considere usar métodos específicos do Supabase.');
      throw new Error('Use métodos específicos do Supabase em vez de SQL direto');
    } else {
      // Usa PostgreSQL local
      const result = await query(sqlQuery, params);
      return result.rows;
    }
  }

  // Métodos genéricos para Supabase
  async findAll(filters = {}, orderBy = 'created_at') {
    if (this.useSupabase) {
      let query = supabase.from(this.tableName).select('*');
      
      // Aplicar filtros
      Object.keys(filters).forEach(key => {
        query = query.eq(key, filters[key]);
      });
      
      // Aplicar ordenação
      query = query.order(orderBy);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    } else {
      // Fallback para PostgreSQL local
      const whereClause = Object.keys(filters).length > 0 
        ? 'WHERE ' + Object.keys(filters).map((key, index) => `${key} = $${index + 1}`).join(' AND ')
        : '';
      
      const sqlQuery = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY ${orderBy}`;
      const result = await query(sqlQuery, Object.values(filters));
      return result.rows;
    }
  }

  async findById(id) {
    if (this.useSupabase && isSupabaseConnected && await testSupabaseConnection()) {
      try {
        const { data, error } = await supabase
          .from(this.tableName)
          .select('*')
          .eq('id', id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          // Se for erro de conectividade, usar fallback
          if (error.message.includes('fetch failed') || error.message.includes('network')) {
            console.warn(`⚠️  Erro de conectividade no Supabase para ${this.tableName}, usando fallback local`);
            const result = await query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
            return result.rows[0];
          }
          throw error;
        }
        return data;
      } catch (err) {
        // Fallback para banco local em caso de erro de conectividade
        if (err.message.includes('fetch failed') || err.message.includes('network')) {
          console.warn(`⚠️  Erro de conectividade no Supabase para ${this.tableName}, usando fallback local`);
          const result = await query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
          return result.rows[0];
        }
        throw err;
      }
    } else {
      const result = await query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
      return result.rows[0];
    }
  }

  async create(data) {
    if (this.useSupabase && isSupabaseConnected && await testSupabaseConnection()) {
      try {
        const { data: result, error } = await supabase
          .from(this.tableName)
          .insert(data)
          .select()
          .single();
        
        if (error) {
          // Se for erro de conectividade, usar fallback
          if (error.message.includes('fetch failed') || error.message.includes('network')) {
            console.warn(`⚠️  Erro de conectividade no Supabase para ${this.tableName}, usando fallback local`);
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
            
            const sqlQuery = `
              INSERT INTO ${this.tableName} (${keys.join(', ')})
              VALUES (${placeholders})
              RETURNING *
            `;
            
            const result = await query(sqlQuery, values);
            return result.rows[0];
          }
          throw error;
        }
        return result;
      } catch (err) {
        // Fallback para banco local em caso de erro de conectividade
        if (err.message.includes('fetch failed') || err.message.includes('network')) {
          console.warn(`⚠️  Erro de conectividade no Supabase para ${this.tableName}, usando fallback local`);
          const keys = Object.keys(data);
          const values = Object.values(data);
          const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
          
          const sqlQuery = `
            INSERT INTO ${this.tableName} (${keys.join(', ')})
            VALUES (${placeholders})
            RETURNING *
          `;
          
          const result = await query(sqlQuery, values);
          return result.rows[0];
        }
        throw err;
      }
    } else {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      
      const sqlQuery = `
        INSERT INTO ${this.tableName} (${keys.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await query(sqlQuery, values);
      return result.rows[0];
    }
  }

  async update(id, data) {
    if (this.useSupabase) {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    } else {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
      
      const sqlQuery = `
        UPDATE ${this.tableName} 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await query(sqlQuery, [id, ...values]);
      return result.rows[0];
    }
  }

  async delete(id) {
    if (this.useSupabase) {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } else {
      await query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
      return true;
    }
  }

  async inactivate(id) {
    return this.update(id, { ativo: false });
  }

  async reactivate(id) {
    return this.update(id, { ativo: true });
  }
}

module.exports = BaseModel;