require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Configurações do Supabase não encontradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableSchema() {
    console.log('🔍 Verificando estrutura das tabelas no Supabase...\n');

    const tables = ['fornecedores', 'tipos_despesa', 'faturados', 'contas_pagar', 'parcelas'];

    for (const table of tables) {
        console.log(`📋 Tabela: ${table}`);
        console.log('─'.repeat(50));

        try {
            // Buscar dados de exemplo para entender a estrutura
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);

            if (error) {
                console.log(`   ❌ Erro ao acessar tabela: ${error.message}`);
            } else {
                console.log(`   ✅ Tabela acessível`);
                
                if (data && data.length > 0) {
                    console.log(`   📊 Colunas encontradas:`);
                    Object.keys(data[0]).forEach(column => {
                        console.log(`      - ${column}: ${typeof data[0][column]}`);
                    });
                } else {
                    console.log(`   📊 Tabela vazia - verificando com inserção de teste...`);
                    
                    // Tentar inserir dados de teste para verificar estrutura
                    let testData = {};
                    switch (table) {
                        case 'fornecedores':
                            testData = {
                                nome: 'Teste Fornecedor',
                                cnpj: '12345678000199',
                                email: 'teste@teste.com'
                            };
                            break;
                        case 'tipos_despesa':
                            testData = {
                                nome: 'Teste Despesa',
                                descricao: 'Descrição teste'
                            };
                            break;
                        case 'faturados':
                            testData = {
                                nome: 'Teste Faturado',
                                cnpj: '98765432000188'
                            };
                            break;
                        case 'contas_pagar':
                            testData = {
                                numero_nota: 'TESTE001',
                                valor_total: 100.00,
                                data_vencimento: new Date().toISOString().split('T')[0]
                            };
                            break;
                        case 'parcelas':
                            testData = {
                                numero_parcela: 1,
                                valor: 50.00,
                                data_vencimento: new Date().toISOString().split('T')[0]
                            };
                            break;
                    }

                    const { data: insertData, error: insertError } = await supabase
                        .from(table)
                        .insert(testData)
                        .select();

                    if (insertError) {
                        console.log(`   ⚠️  Erro ao inserir teste: ${insertError.message}`);
                        console.log(`   💡 Isso pode indicar colunas obrigatórias ou restrições`);
                    } else {
                        console.log(`   ✅ Inserção de teste bem-sucedida`);
                        console.log(`   📊 Estrutura detectada:`);
                        if (insertData && insertData.length > 0) {
                            Object.keys(insertData[0]).forEach(column => {
                                console.log(`      - ${column}: ${typeof insertData[0][column]}`);
                            });
                        }

                        // Limpar dados de teste
                        await supabase
                            .from(table)
                            .delete()
                            .eq('id', insertData[0].id);
                        console.log(`   🧹 Dados de teste removidos`);
                    }
                }
            }

            // Verificar contagem de registros
            const { count, error: countError } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (!countError) {
                console.log(`   📈 Total de registros: ${count}`);
            }

        } catch (err) {
            console.log(`   ❌ Erro inesperado: ${err.message}`);
        }

        console.log('');
    }
}

async function checkRelationships() {
    console.log('🔗 Verificando relacionamentos entre tabelas...\n');

    // Verificar se existem chaves estrangeiras funcionais
    const relationships = [
        {
            from: 'contas_pagar',
            to: 'fornecedores',
            key: 'fornecedor_id'
        },
        {
            from: 'contas_pagar',
            to: 'tipos_despesa',
            key: 'tipo_despesa_id'
        },
        {
            from: 'contas_pagar',
            to: 'faturados',
            key: 'faturado_id'
        },
        {
            from: 'parcelas',
            to: 'contas_pagar',
            key: 'conta_pagar_id'
        }
    ];

    for (const rel of relationships) {
        console.log(`🔗 ${rel.from} → ${rel.to} (via ${rel.key})`);
        
        try {
            // Tentar fazer um join simples para verificar relacionamento
            const { data, error } = await supabase
                .from(rel.from)
                .select(`*, ${rel.to}(*)`)
                .limit(1);

            if (error) {
                console.log(`   ❌ Relacionamento não funcional: ${error.message}`);
            } else {
                console.log(`   ✅ Relacionamento funcional`);
            }
        } catch (err) {
            console.log(`   ❌ Erro ao verificar relacionamento: ${err.message}`);
        }
    }
}

async function main() {
    console.log('🚀 Verificação completa do schema do banco de dados\n');
    console.log('='.repeat(60));
    
    try {
        await checkTableSchema();
        await checkRelationships();
        
        console.log('='.repeat(60));
        console.log('✅ Verificação do schema concluída!');
        
    } catch (error) {
        console.error('❌ Erro durante verificação:', error.message);
        process.exit(1);
    }
}

main();