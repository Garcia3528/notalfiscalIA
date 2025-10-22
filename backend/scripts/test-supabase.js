require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  console.log('🔍 Testando conectividade com Supabase...\n');
  
  // Verificar variáveis de ambiente
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  console.log('📋 Configurações:');
  console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`   SUPABASE_KEY: ${supabaseKey ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key (primeiros 20 chars): ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'N/A'}\n`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Configurações do Supabase não encontradas no .env');
    return false;
  }
  
  try {
    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Cliente Supabase criado com sucesso');
    
    // Testar conexão básica
    console.log('🔄 Testando conexão básica...');
    const { data, error } = await supabase.from('fornecedores').select('count').limit(1);
    
    if (error) {
      console.log('❌ Erro na conexão básica:', error.message);
      console.log('   Detalhes:', error);
      return false;
    }
    
    console.log('✅ Conexão básica funcionando');
    
    // Testar busca por CNPJ (simulando o erro)
    console.log('🔄 Testando busca por CNPJ...');
    const { data: fornecedor, error: cnpjError } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('cnpj', '12345678000199')
      .single();
    
    if (cnpjError && cnpjError.code !== 'PGRST116') {
      console.log('❌ Erro na busca por CNPJ:', cnpjError.message);
      console.log('   Código:', cnpjError.code);
      console.log('   Detalhes:', cnpjError);
      return false;
    }
    
    console.log('✅ Busca por CNPJ funcionando');
    console.log('   Resultado:', fornecedor ? 'Fornecedor encontrado' : 'Fornecedor não encontrado (normal)');
    
    // Testar tabelas necessárias
    console.log('🔄 Verificando tabelas necessárias...');
    const tabelas = ['fornecedores', 'faturados', 'tipos_despesa'];
    
    for (const tabela of tabelas) {
      try {
        const { data, error } = await supabase.from(tabela).select('count').limit(1);
        if (error) {
          console.log(`❌ Tabela '${tabela}' não acessível:`, error.message);
        } else {
          console.log(`✅ Tabela '${tabela}' acessível`);
        }
      } catch (err) {
        console.log(`❌ Erro ao acessar tabela '${tabela}':`, err.message);
      }
    }
    
    console.log('\n🎉 Teste de conectividade concluído com sucesso!');
    return true;
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
    console.log('   Stack:', error.stack);
    return false;
  }
}

// Executar teste
testSupabaseConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Erro não capturado:', error);
    process.exit(1);
  });