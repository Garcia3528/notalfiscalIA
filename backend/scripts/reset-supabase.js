require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const sentinel = '00000000-0000-0000-0000-000000000000';

  const tablesInOrder = [
    // Relacionamentos primeiro para evitar violação de FK em bancos sem cascata
    'conta_pagar_tipo_despesa',
    'conta_receber_tipo_receita',
    // Parcelas
    'parcelas',
    'parcelas_receber',
    // Contas
    'contas_pagar',
    'contas_receber',
    // Entidades base
    'fornecedores',
    'faturados',
    'clientes',
    // Catálogos
    'tipos_despesa',
    'tipos_receita'
  ];

  async function count(table) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`   ⚠️ Falha ao contar em '${table}': ${error.message}`);
      return null;
    }
    return count ?? null;
  }

  async function wipe(table) {
    const before = await count(table);
    console.log(`🧹 Limpando '${table}' (registros atuais: ${before ?? 'desconhecido'})...`);
    const { error } = await supabase.from(table).delete().neq('id', sentinel);
    if (error) {
      console.error(`❌ Erro ao limpar '${table}': ${error.message}`);
      return false;
    }
    const after = await count(table);
    console.log(`✅ '${table}' limpo. Registros após limpeza: ${after ?? 'desconhecido'}`);
    return true;
  }

  console.log('🚀 Iniciando limpeza completa do banco Supabase...');
  for (const t of tablesInOrder) {
    await wipe(t);
  }
  console.log('🎉 Limpeza concluída!');
}

if (require.main === module) {
  main().catch(err => {
    console.error('💥 Erro geral na limpeza:', err);
    process.exit(1);
  });
}