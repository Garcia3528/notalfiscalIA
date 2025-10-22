const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando variáveis de ambiente...\n');

// Verificar se o arquivo .env existe
const envPath = path.resolve('.env');
console.log(`📁 Procurando arquivo .env em: ${envPath}`);
console.log(`📄 Arquivo existe: ${fs.existsSync(envPath)}`);

if (fs.existsSync(envPath)) {
  console.log('📖 Conteúdo do arquivo .env:');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').slice(0, 15); // Primeiras 15 linhas
  lines.forEach((line, index) => {
    if (line.trim() && !line.startsWith('#')) {
      console.log(`   ${index + 1}: ${line}`);
    }
  });
  console.log();
}

// Carregar dotenv DEPOIS de verificar o arquivo
require('dotenv').config();

console.log('🔧 Variáveis carregadas pelo dotenv:');
const envVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'GEMINI_API_KEY'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName.includes('KEY') || varName.includes('PASSWORD')) {
      console.log(`✅ ${varName}: ${value.substring(0, 15)}...${value.substring(value.length - 5)}`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: Não definida`);
  }
});

console.log('\n🔧 Verificando se Supabase está configurado...');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log(`URL completa: "${supabaseUrl}"`);
console.log(`Key completa: "${supabaseKey ? supabaseKey.substring(0, 30) + '...' : 'undefined'}"`);

if (supabaseUrl && supabaseKey && 
    !supabaseUrl.includes('sua_url') && 
    !supabaseKey.includes('sua_chave') &&
    supabaseUrl.startsWith('http')) {
  console.log('✅ Supabase está configurado corretamente');
  
  // Teste de conexão
  console.log('\n🧪 Testando conexão com Supabase...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Cliente Supabase criado com sucesso');
  } catch (error) {
    console.log('❌ Erro ao criar cliente Supabase:', error.message);
  }
} else {
  console.log('❌ Supabase não está configurado ou tem valores placeholder');
  console.log(`   Problema detectado:`);
  if (!supabaseUrl) console.log('   - URL não definida');
  else if (supabaseUrl.includes('sua_url')) console.log('   - URL contém placeholder');
  else if (!supabaseUrl.startsWith('http')) console.log('   - URL não é HTTP/HTTPS');
  
  if (!supabaseKey) console.log('   - Key não definida');
  else if (supabaseKey.includes('sua_chave')) console.log('   - Key contém placeholder');
}