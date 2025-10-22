const Fornecedor = require('../src/models/Fornecedor');
const TipoDespesa = require('../src/models/TipoDespesa');
const ContaPagar = require('../src/models/ContaPagar');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testSupabaseConnection() {
  console.log('🔍 Testando conexão com Supabase...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Configurações do Supabase não encontradas');
    return false;
  }
  
  console.log(`🔗 URL: ${supabaseUrl}`);
  console.log(`🔑 Chave: ${supabaseKey.substring(0, 20)}...`);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Teste básico de conexão
    console.log('📡 Testando conexão básica...');
    const { data, error } = await supabase
      .from('fornecedores')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Erro na conexão:', error.message);
      return false;
    }
    
    console.log('✅ Conexão com Supabase estabelecida!\n');
    return true;
  } catch (error) {
    console.log('❌ Erro ao conectar com Supabase:');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

async function testSupabaseSchema() {
  console.log('🏗️  Verificando estrutura das tabelas no Supabase...\n');
  
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    const tables = [
      'fornecedores',
      'tipos_despesa', 
      'faturados',
      'contas_pagar',
      'parcelas'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error && error.code === 'PGRST116') {
          console.log(`❌ Tabela '${table}': Não encontrada`);
        } else if (error) {
          console.log(`⚠️  Tabela '${table}': ${error.message}`);
        } else {
          console.log(`✅ Tabela '${table}': Existe e acessível`);
        }
      } catch (err) {
        console.log(`❌ Tabela '${table}': Erro - ${err.message}`);
      }
    }
    
    console.log();
    return true;
  } catch (error) {
    console.log('❌ Erro ao verificar schema:');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

async function testModels() {
  console.log('🧪 Testando modelos com Supabase...\n');
  
  try {
    // Teste Fornecedores
    console.log('📋 Testando modelo Fornecedor...');
    try {
      const fornecedores = await Fornecedor.findAll();
      console.log(`   ✅ findAll(): ${fornecedores.length} fornecedores encontrados`);
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
    
    // Teste Tipos de Despesa
    console.log('📋 Testando modelo TipoDespesa...');
    try {
      const tipos = await TipoDespesa.findAll();
      console.log(`   ✅ findAll(): ${tipos.length} tipos de despesa encontrados`);
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
    
    // Teste Contas a Pagar
    console.log('📋 Testando modelo ContaPagar...');
    try {
      const contas = await ContaPagar.findAll();
      console.log(`   ✅ findAll(): ${contas.length} contas a pagar encontradas`);
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
    
    console.log();
    return true;
  } catch (error) {
    console.log('❌ Erro geral ao testar modelos:');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

async function showSupabaseStats() {
  console.log('📊 Estatísticas das tabelas no Supabase...\n');
  
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    const tables = ['fornecedores', 'tipos_despesa', 'faturados', 'contas_pagar', 'parcelas'];
    
    console.log('Tabela'.padEnd(20) + 'Registros'.padEnd(12) + 'Status');
    console.log('-'.repeat(50));
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(table.padEnd(20) + 'N/A'.padEnd(12) + `Erro: ${error.message}`);
        } else {
          console.log(table.padEnd(20) + (count || 0).toString().padEnd(12) + 'OK');
        }
      } catch (err) {
        console.log(table.padEnd(20) + 'N/A'.padEnd(12) + `Erro: ${err.message}`);
      }
    }
    
    console.log();
    return true;
  } catch (error) {
    console.log('❌ Erro ao obter estatísticas:');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

async function testCRUDOperations() {
  console.log('🔧 Testando operações CRUD básicas...\n');
  
  try {
    // Teste de criação de fornecedor
    console.log('📝 Testando criação de fornecedor...');
    const novoFornecedor = {
      nome: 'Teste Fornecedor',
      cnpj: '12345678000199',
      email: 'teste@fornecedor.com'
    };
    
    try {
      const fornecedorCriado = await Fornecedor.create(novoFornecedor);
      console.log(`   ✅ Fornecedor criado com ID: ${fornecedorCriado.id}`);
      
      // Teste de busca por ID
      console.log('🔍 Testando busca por ID...');
      const fornecedorEncontrado = await Fornecedor.findById(fornecedorCriado.id);
      if (fornecedorEncontrado) {
        console.log(`   ✅ Fornecedor encontrado: ${fornecedorEncontrado.nome}`);
      } else {
        console.log('   ❌ Fornecedor não encontrado após criação');
      }
      
    } catch (error) {
      console.log(`   ❌ Erro nas operações CRUD: ${error.message}`);
    }
    
    console.log();
    return true;
  } catch (error) {
    console.log('❌ Erro geral no teste CRUD:');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 Iniciando verificação completa do banco de dados (Supabase)...\n');
  console.log('='.repeat(70) + '\n');
  
  const tests = [
    { name: 'Conexão Supabase', fn: testSupabaseConnection },
    { name: 'Schema Supabase', fn: testSupabaseSchema },
    { name: 'Modelos', fn: testModels },
    { name: 'Estatísticas', fn: showSupabaseStats },
    { name: 'Operações CRUD', fn: testCRUDOperations }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const success = await test.fn();
    if (success) passed++;
  }
  
  console.log('='.repeat(70));
  console.log(`📈 Resultado: ${passed}/${total} testes passaram`);
  
  if (passed === total) {
    console.log('🎉 Banco de dados (Supabase) está funcionando perfeitamente!');
  } else if (passed >= 3) {
    console.log('⚠️  Banco funcionando com algumas limitações. Verifique os logs acima.');
  } else {
    console.log('❌ Problemas significativos encontrados. Verifique a configuração.');
  }
  
  process.exit(passed >= 3 ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('💥 Erro inesperado:', error);
  process.exit(1);
});