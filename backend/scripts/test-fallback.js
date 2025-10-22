const http = require('http');

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/analise/verificar',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testFallback() {
  console.log('🧪 Testando mecanismo de fallback...\n');

  const testCases = [
    { cnpj: '12345678000195', description: 'CNPJ de teste 1' },
    { cnpj: '98765432000123', description: 'CNPJ de teste 2' },
    { cnpj: '11111111000111', description: 'CNPJ de teste 3' }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`📋 Testando: ${testCase.description} (${testCase.cnpj})`);
      
      const response = await makeRequest({ cnpj: testCase.cnpj });

      console.log(`✅ Sucesso (${response.status}): ${JSON.stringify(response.data)}`);
      
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
    console.log('');
  }

  // Teste com CPF
  try {
    console.log('📋 Testando com CPF: 12345678901');
    
    const response = await makeRequest({ cpf: '12345678901' });

    console.log(`✅ Sucesso (${response.status}): ${JSON.stringify(response.data)}`);
    
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
  }

  console.log('\n🏁 Teste de fallback concluído!');
}

testFallback().catch(console.error);