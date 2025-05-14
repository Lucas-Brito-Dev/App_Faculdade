// Versão atualizada de cadastro.js com campo de nome completo
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, registrarUsuario } from '../../servicos/supabase';

export default function TelaCadastro() {
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const router = useRouter();

  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const limparErro = () => {
    if (erro) setErro(null);
  };

  const fazerCadastro = async () => {
    // Limpar erro anterior
    limparErro();
    
    // Validações básicas
    if (!nomeCompleto || !email || !senha || !confirmarSenha) {
      setErro('Por favor, preencha todos os campos.');
      return;
    }

    if (nomeCompleto.trim().length < 3) {
      setErro('O nome deve ter pelo menos 3 caracteres.');
      return;
    }

    if (!validarEmail(email)) {
      setErro('Por favor, insira um endereço de email válido.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não correspondem!');
      return;
    }

    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setCarregando(true);
    
    try {
      // Depuração: mostrar o que estamos enviando
      console.log(`Tentando cadastrar: Nome: "${nomeCompleto}", Email: "${email}"`);
      
      // Registrar o usuário com email, senha e nome completo
      const { data, error } = await registrarUsuario(email, senha, nomeCompleto);

      if (error) {
        console.error('Erro na API de cadastro:', error);
        
        // Tratamento mais detalhado de erros comuns
        if (error.message?.includes('already registered') || 
            error.message?.includes('already exists') || 
            error.message?.includes('User already registered')) {
          setErro('Este email já está registrado. Tente fazer login ou recuperar sua senha.');
        } 
        else if (error.message?.includes('invalid')) {
          // Problema de validação de email comum
          setErro(`Email rejeitado pelo servidor: ${error.message}`);
        }
        else {
          setErro(error.message || 'Ocorreu um erro ao tentar criar a conta.');
        }
      } else if (data?.user) {
        // Sucesso
        Alert.alert(
          'Conta criada!', 
          'Sua conta foi criada com sucesso!',
          [{ text: 'OK', onPress: () => router.replace('/(autenticacao)/login') }]
        );
      } else {
        // Caso edge: temos data mas não temos user
        console.warn('Resposta estranha da API:', data);
        setErro('O servidor retornou uma resposta inesperada. Tente novamente.');
      }
    } catch (e) {
      console.error('Exceção no cadastro:', e);
      setErro('Erro inesperado durante o cadastro. Verifique sua conexão e tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0A0A18', '#1C1C2E', '#121236']}
      style={estilos.container}
    >
      <View style={estilos.contentContainer}>
        <Text style={estilos.titulo}>Criar Conta</Text>
        
        <View style={estilos.form}>
          {erro && (
            <View style={estilos.erroContainer}>
              <Text style={estilos.erroTexto}>{erro}</Text>
            </View>
          )}
          
          <TextInput
            style={estilos.input}
            placeholder="Nome Completo"
            value={nomeCompleto}
            onChangeText={(text) => {
              setNomeCompleto(text);
              limparErro();
            }}
            autoCapitalize="words"
            autoCorrect={false}
            placeholderTextColor="#888"
          />
          
          <TextInput
            style={estilos.input}
            placeholder="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              limparErro();
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#888"
          />
          
          <TextInput
            style={estilos.input}
            placeholder="Senha (mínimo 6 caracteres)"
            value={senha}
            onChangeText={(text) => {
              setSenha(text);
              limparErro();
            }}
            secureTextEntry
            placeholderTextColor="#888"
          />
          
          <TextInput
            style={estilos.input}
            placeholder="Confirmar Senha"
            value={confirmarSenha}
            onChangeText={(text) => {
              setConfirmarSenha(text);
              limparErro();
            }}
            secureTextEntry
            placeholderTextColor="#888"
          />
          
          {carregando ? (
            <ActivityIndicator size="large" color="#00E0FF" style={estilos.loading} />
          ) : (
            <View style={estilos.buttonContainer}>
              <TouchableOpacity onPress={fazerCadastro} style={estilos.cadastrarButton}>
                <LinearGradient
                  colors={['#0090D9', '#00E0FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={estilos.gradient}
                >
                  <Text style={estilos.cadastrarButtonText}>Cadastrar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <Link href="/(autenticacao)/login" asChild>
          <Text style={estilos.link}>Já tem uma conta? Faça login</Text>
        </Link>
      </View>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
  },
  titulo: {
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#00E0FF',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0, 224, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  form: {
    width: '100%',
  },
  input: {
    height: 60,
    borderColor: '#00E0FF',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderRadius: 12,
    color: '#FFFFFF',
    backgroundColor: 'rgba(42, 42, 58, 0.8)',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 10,
  },
  cadastrarButton: {
    height: 55,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#00E0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cadastrarButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loading: {
    marginVertical: 20,
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    color: '#00E0FF',
    fontSize: 16,
  },
  erroContainer: {
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF4757',
  },
  erroTexto: {
    color: '#FF4757',
    textAlign: 'center',
    fontSize: 14,
  },
});