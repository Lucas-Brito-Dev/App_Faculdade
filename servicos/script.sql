-- SCRIPT SQL COMPLETO PARA SUPABASE
-- Este script configura todas as tabelas, funções, triggers e políticas de segurança
-- necessárias para o aplicativo de registro de ponto

-- ============================================================
-- CONFIGURAÇÃO INICIAL
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- TABELAS DO SISTEMA
-- ============================================================

-- Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de registros de ponto
CREATE TABLE IF NOT EXISTS public.registros_ponto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'inicio_almoco', 'fim_almoco', 'saida')),
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para registros de localização
CREATE TABLE IF NOT EXISTS public.registros_localizacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    precisao DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- FUNÇÕES
-- ============================================================

-- Função para atualizar timestamp de 'updated_at'
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para criar automaticamente um perfil quando um usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome_completo, email)
  VALUES (NEW.id, 
         COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Usuário ' || substr(NEW.id::text, 1, 8)),
         NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar um ponto
CREATE OR REPLACE FUNCTION public.registrar_ponto(
  p_user_id UUID,
  p_tipo TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_observacao TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_ponto_id UUID;
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Verificar se o tipo é válido
  IF p_tipo NOT IN ('entrada', 'inicio_almoco', 'fim_almoco', 'saida') THEN
    RAISE EXCEPTION 'Tipo de ponto inválido';
  END IF;
  
  -- Registrar o ponto
  INSERT INTO public.registros_ponto (
    user_id, 
    tipo, 
    data_hora, 
    latitude, 
    longitude, 
    observacao
  )
  VALUES (
    p_user_id, 
    p_tipo, 
    CURRENT_TIMESTAMP, 
    p_latitude, 
    p_longitude, 
    p_observacao
  )
  RETURNING id INTO v_ponto_id;
  
  RETURN v_ponto_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar localização
CREATE OR REPLACE FUNCTION public.registrar_localizacao(
  p_user_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_precisao DOUBLE PRECISION DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_location_id UUID;
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Registrar a localização
  INSERT INTO public.registros_localizacao (
    user_id, 
    latitude, 
    longitude, 
    precisao
  )
  VALUES (
    p_user_id, 
    p_latitude, 
    p_longitude, 
    p_precisao
  )
  RETURNING id INTO v_location_id;
  
  RETURN v_location_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger para atualizar 'updated_at' em perfis
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.perfis
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Trigger para criar um perfil quando um novo usuário é criado
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- POLÍTICA DE SEGURANÇA RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS para as tabelas
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_localizacao ENABLE ROW LEVEL SECURITY;

-- Políticas para perfis
CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON public.perfis FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
ON public.perfis FOR UPDATE 
USING (auth.uid() = id);

-- Políticas para registros de ponto
CREATE POLICY "Usuários podem ver seus próprios registros de ponto" 
ON public.registros_ponto FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios registros de ponto" 
ON public.registros_ponto FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios registros de ponto" 
ON public.registros_ponto FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seus próprios registros de ponto" 
ON public.registros_ponto FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para registros de localização
CREATE POLICY "Usuários podem ver seus próprios registros de localização" 
ON public.registros_localizacao FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios registros de localização" 
ON public.registros_localizacao FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PERMISSÕES PARA USUÁRIOS ANÔNIMOS E AUTENTICADOS
-- ============================================================

-- Permissões para usuários anônimos (necessário para registro e login)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE public.perfis TO anon;

-- Permissões para usuários autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.perfis TO authenticated;
GRANT ALL ON TABLE public.registros_ponto TO authenticated;
GRANT ALL ON TABLE public.registros_localizacao TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_ponto TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_localizacao TO authenticated;

-- ============================================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- ============================================================

-- Índices para tabela de perfis
CREATE INDEX IF NOT EXISTS idx_perfis_email ON public.perfis(email);

-- Índices para tabela de registros de ponto
CREATE INDEX IF NOT EXISTS idx_registros_ponto_user_id ON public.registros_ponto(user_id);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_data_hora ON public.registros_ponto(data_hora);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_user_data 
ON public.registros_ponto(user_id, data_hora);

-- Índices para tabela de registros de localização
CREATE INDEX IF NOT EXISTS idx_registros_localizacao_user_id 
ON public.registros_localizacao(user_id);
CREATE INDEX IF NOT EXISTS idx_registros_localizacao_timestamp 
ON public.registros_localizacao(timestamp);
CREATE INDEX IF NOT EXISTS idx_registros_localizacao_user_timestamp 
ON public.registros_localizacao(user_id, timestamp);

-- Índice espacial para localização (usando PostGIS se disponível)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_registros_localizacao_spatial 
    ON public.registros_localizacao USING gist (
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    )';
  END IF;
END $$;