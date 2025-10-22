const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
    console.log('🔍 Testando conexão PostgreSQL com as novas configurações...');
    
    // Primeiro conectar ao banco postgres padrão
    const defaultPool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: 'postgres',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        const client = await defaultPool.connect();
        console.log('✅ Conexão PostgreSQL bem-sucedida!');
        
        // Verificar se o banco nota_fiscal_db existe
        const dbResult = await client.query("SELECT 1 FROM pg_database WHERE datname = 'nota_fiscal_db'");
        
        if (dbResult.rows.length === 0) {
            console.log('📋 Banco nota_fiscal_db não existe. Criando...');
            await client.query('CREATE DATABASE nota_fiscal_db');
            console.log('✅ Banco nota_fiscal_db criado com sucesso!');
        } else {
            console.log('✅ Banco nota_fiscal_db já existe!');
        }
        
        client.release();
        await defaultPool.end();
        
        // Agora testar conexão com o banco nota_fiscal_db
        console.log('\n🔍 Testando conexão com o banco nota_fiscal_db...');
        const appPool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });
        
        const appClient = await appPool.connect();
        console.log('✅ Conexão com nota_fiscal_db bem-sucedida!');
        
        // Verificar tabelas existentes
        const tablesResult = await appClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        console.log('📋 Tabelas existentes:');
        if (tablesResult.rows.length === 0) {
            console.log('  - Nenhuma tabela encontrada');
        } else {
            tablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));
        }
        
        appClient.release();
        await appPool.end();
        
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão PostgreSQL:', error.message);
        await defaultPool.end();
        return false;
    }
}

testConnection().then(success => {
    process.exit(success ? 0 : 1);
});