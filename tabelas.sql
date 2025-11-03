-- SCHEMA DO BANCO DE DADOS MEU BURGUER
-- Executar no SQL Editor do Supabase

-- Tabela de Produtos (Hambúrgueres)
CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10, 2) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  imagem_url TEXT,
  disponivel BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  destaque BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Adicionais/Complementos
CREATE TABLE IF NOT EXISTS adicionais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  preco DECIMAL(10, 2) NOT NULL,
  imagem_url TEXT,
  disponivel BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Bebidas
CREATE TABLE IF NOT EXISTS bebidas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  preco DECIMAL(10, 2) NOT NULL,
  tamanho VARCHAR(50),
  disponivel BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_cliente VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  endereco TEXT,
  tipo_entrega VARCHAR(50) NOT NULL CHECK (tipo_entrega IN ('entrega', 'retirada')),
  forma_pagamento VARCHAR(50) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  taxa_entrega DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  observacoes TEXT,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'preparando', 'pronto', 'entregue', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  nome_produto VARCHAR(255) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Adicionais do Item
CREATE TABLE IF NOT EXISTS item_adicionais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_pedido_id UUID REFERENCES itens_pedido(id) ON DELETE CASCADE,
  adicional_id UUID REFERENCES adicionais(id),
  nome_adicional VARCHAR(255) NOT NULL,
  preco DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_disponivel ON produtos(disponivel);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualização automática de updated_at
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adicionais_updated_at BEFORE UPDATE ON adicionais 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bebidas_updated_at BEFORE UPDATE ON bebidas 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais dos Produtos (Hambúrgueres)
INSERT INTO produtos (nome, descricao, preco, categoria, imagem_url, destaque, ordem) VALUES
('X-FRANGO', 'Pão artesanal • Frango desfiado (90g) • Catupiry • Ovo • Queijo • Cebola • Alface • Tomate • Creme especial', 12.00, 'Clássicos', '/assets/hamb/x-frango.jpg', false, 1),
('TRADICIONAL', 'Pão artesanal • Blend de picanha (100g) • Queijo • Presunto • Alface • Tomate • Creme especial', 13.00, 'Clássicos', '/assets/hamb/tradicional.jpg', false, 2),
('PORTUENSE', 'Pão artesanal • Blend de picanha (100g) • Frango desfiado • Catupiry • Cheddar • Queijo • Presunto • Creme especial', 19.00, 'Premium', '/assets/hamb/portuense.jpg', false, 3),
('MEU TUDÃO', 'Pão artesanal • Blend de picanha (100g) • Frango desfiado • Ovo • Queijo • Presunto • Bacon • Cheddar • Catupiry • Calabresa • Cebola • Creme especial', 20.00, 'Premium', '/assets/hamb/meu-tudao.jpg', false, 4),
('MEU BURGUER', 'Pão artesanal • 2 blends de picanha (100g cada) • Bacon • Calabresa • 2 Queijo • Presunto • Alface • Tomate • Creme especial', 25.00, 'Especialidade da Casa', '/assets/hamb/meu-burguer.jpg', true, 5),
('X-CHEDDAR', 'Pão artesanal • Blend de picanha (100g) • Cheddar • Catupiry • Queijo • Presunto • Alface • Tomate • Creme especial', 14.00, 'Especiais da Casa', '/assets/hamb/x-cheddar.jpg', false, 6),
('X-CALABRESA', 'Pão artesanal • Blend de picanha (100g) • Calabresa • Catupiry • Queijo • Presunto • Cebola • Alface • Tomate • Creme especial', 15.00, 'Especiais da Casa', '/assets/hamb/x-calabresa.jpg', false, 7),
('MARRUÁS', 'Pão artesanal • Blend de picanha (100g) • Ovo • Cheddar • Catupiry • Queijo • Presunto • Tomate • Creme especial', 16.00, 'Especiais da Casa', '/assets/hamb/marruas.jpg', false, 8),
('X-BACON', 'Pão artesanal • Blend de picanha (100g) • Bacon • Catupiry • Ovo • Queijo • Presunto • Creme especial', 17.00, 'Especiais da Casa', '/assets/hamb/x-bacon.jpg', true, 9),
('NORDESTINO', 'Pão artesanal • Carne de sol desfiada (90g) • Catupiry • Queijo • Ovo • Cebola • Alface • Tomate • Creme especial', 18.00, 'Especiais da Casa', '/assets/hamb/nordestino.jpg', true, 10),
('X-BURGUER', 'Pão • Carne industrial • Queijo • Presunto • Alface • Tomate • Creme especial', 9.00, 'Linha Industrial', '/assets/hamb/x-burguer.jpg', false, 11),
('MEGA CALABRESA', 'Pão • Carne industrial • Calabresa • Queijo • Presunto • Alface • Tomate • Creme especial', 13.00, 'Linha Industrial', '/assets/hamb/mega-calabresa.jpg', false, 12),
('SUPER MEGA BACON', 'Pão artesanal • Carne industrial • Bacon • Queijo • Presunto • Alface • Tomate • Creme especial', 14.00, 'Linha Industrial', '/assets/hamb/super-mega-bacon.jpg', false, 13),
('SUPER CHEDDAR', 'Pão artesanal • Carne industrial • Cheddar • Queijo • Presunto • Alface • Tomate • Creme especial', 13.00, 'Linha Industrial', '/assets/hamb/super-cheddar.jpg', true, 14),
('X-TOPA TUDO', 'Pão • 2 carnes industriais • Ovo • Cheddar • Queijo • Presunto • Creme especial', 16.00, 'Linha Industrial', '/assets/hamb/x-topa-tudo.jpg', true, 15);

-- Inserir dados iniciais dos Adicionais
INSERT INTO adicionais (nome, preco, imagem_url, ordem) VALUES
('CARNE ARTESANAL', 6.00, '/assets/adicionais/carneartesenal.png', 1),
('CARNE INDUSTRIAL', 5.00, '/assets/adicionais/carneindustrial.png', 2),
('GELEIA DE PIMENTA', 3.00, '/assets/adicionais/geleiadepimenta.png', 3),
('BACON', 3.00, '/assets/adicionais/bacon.png', 4),
('CHEDDAR', 2.50, '/assets/adicionais/cheddar.png', 5),
('CATUPIRY', 2.50, '/assets/adicionais/catupiry.png', 6),
('CALABRESA', 2.50, '/assets/adicionais/calabresa.png', 7),
('OVO', 2.50, '/assets/adicionais/ovo.png', 8),
('QUEIJO', 2.50, '/assets/adicionais/queijo.png', 9);

-- Inserir dados iniciais das Bebidas
INSERT INTO bebidas (nome, preco, tamanho, ordem) VALUES
('GUARANÁ ANTÁRTICA', 14.00, '2L', 1),
('COCA COLA RETORNÁVEL', 8.00, '1L', 2),
('GUARANÁ ANTÁRTICA', 8.00, '1L', 3),
('REFRIGERANTE LATA', 5.00, '350ml', 4),
('PITCHULA', 3.00, '200ml', 5),
('SUCO', 6.00, '500ml', 6),
('ÁGUA MINERAL', 4.00, '500ml', 7);

