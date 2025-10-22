const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGeminiKey() {
  console.log('🔍 Testando chave do Gemini AI...\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY não encontrada no arquivo .env');
    return false;
  }
  
  console.log(`🔑 Chave encontrada: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);
  
  try {
    // Inicializar o cliente
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    console.log('📡 Testando conexão com a API...');
    
    // Fazer uma requisição simples de teste
    const prompt = "Responda apenas 'OK' se você conseguir me entender.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log(`📝 Resposta da API: "${text.trim()}"`);
    
    if (text.trim().toLowerCase().includes('ok')) {
      console.log('✅ Chave do Gemini está funcionando corretamente!');
      return true;
    } else {
      console.log('⚠️  API respondeu, mas resposta inesperada');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Erro ao testar a chave do Gemini:');
    console.log(`   Tipo: ${error.constructor.name}`);
    console.log(`   Mensagem: ${error.message}`);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('💡 A chave parece ser inválida. Verifique se:');
      console.log('   - A chave foi copiada corretamente');
      console.log('   - A API do Gemini está habilitada no Google Cloud');
      console.log('   - A chave tem as permissões necessárias');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      console.log('💡 Quota da API excedida. Verifique seu limite no Google Cloud.');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('💡 Permissão negada. Verifique as configurações da API no Google Cloud.');
    }
    
    return false;
  }
}

// Executar o teste
testGeminiKey().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎉 Teste concluído com sucesso!');
    console.log('💡 O sistema pode usar IA para extração de dados.');
  } else {
    console.log('⚠️  Teste falhou.');
    console.log('💡 O sistema usará extração básica (regex) como fallback.');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Erro inesperado:', error);
  process.exit(1);
});