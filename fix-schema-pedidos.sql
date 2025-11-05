-- Script para corrigir schema da tabela pedidos
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar coluna 'tipo' se não existir
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'Presencial';

-- 2. Adicionar constraint para tipo
ALTER TABLE pedidos 
DROP CONSTRAINT IF EXISTS pedidos_tipo_check;

ALTER TABLE pedidos 
ADD CONSTRAINT pedidos_tipo_check 
CHECK (tipo IN ('Online', 'Presencial'));

-- 3. Garantir que status está em maiúscula
UPDATE pedidos 
SET status = INITCAP(status)
WHERE status IN ('pendente', 'confirmado', 'preparando', 'pronto', 'entregue', 'cancelado');

-- 4. Atualizar constraint de status para aceitar ambos formatos
ALTER TABLE pedidos 
DROP CONSTRAINT IF EXISTS pedidos_status_check;

-- 5. Adicionar coluna produto_nome se não existir em itens_pedido (para compatibilidade)
-- Mas vamos usar nome_produto que já existe

-- 6. Verificar estrutura atual
SELECT 'pedidos' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pedidos' 

UNION ALL

SELECT 'itens_pedido' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'itens_pedido'
ORDER BY tabela, data_type;
