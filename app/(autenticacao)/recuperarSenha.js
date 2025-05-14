// Versão corrigida de recuperarSenha.js
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { recuperarSenha } from '../../servicos/supabase'; // Importando a função específica
import * as Linking from 'expo-linking';

export default function TelaRecuperarSenha() {
  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const enviarLinkRecuperacao = async () => {
    if (!email) {
      Alert.alert('Campo vazio', 'Por favor, informe seu email.');
      return;
    }

    if (!validarEmail(email)) {
      Alert.alert('Email inválido', 'Por favor, insira um endereço de email válido.');
      return;
    }

    setCarregando(true);
    try {
      // Usando a função auxiliar do arquivo supabase.js em vez do cliente direto
      const { error, success } = await recuperarSenha(email);

      if (error) {
        console.error('Erro recuperação de senha:', error);
        Alert.alert('Erro ao Recuperar Senha', error.message || 'Ocorreu um erro ao tentar enviar o link de recuperação.');
      } else {
        Alert.alert(
          'Link Enviado', 
          'Se um usuário com este e-mail existir, um link para redefinir a senha foi enviado. Por favor, verifique sua caixa de entrada e spam.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (e) {
      console.error('Exceção na recuperação de senha:', e);
      Alert.alert('Erro Inesperado', 'Verifique sua conexão e tente novamente.');
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
        <Text style={estilos.titulo}>Recuperar Senha</Text>
        <TextInput
          style={estilos.input}
          placeholder="Seu Email Cadastrado"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#888"
        />
        <TouchableOpacity 
          style={estilos.recuperarButton}
          onPress={enviarLinkRecuperacao} 
          disabled={carregando}
        >
          <LinearGradient
            colors={['#0090D9', '#00E0FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={estilos.gradient}
          >
            <Text style={estilos.recuperarButtonText}>
              {carregando ? "Enviando..." : "Enviar Link de Recuperação"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <Link href="/(autenticacao)/login" asChild>
          <Text style={estilos.link}>Voltar para Login</Text>
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
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 35,
    color: '#00E0FF',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0, 224, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  input: {
    height: 60,
    borderColor: '#00E0FF',
    borderWidth: 1,
    marginBottom: 25,
    paddingHorizontal: 15,
    borderRadius: 12,
    color: '#FFFFFF',
    backgroundColor: 'rgba(42, 42, 58, 0.8)',
    fontSize: 16,
  },
  recuperarButton: {
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
  recuperarButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  link: {
    marginTop: 25,
    textAlign: 'center',
    color: '#00E0FF',
    fontSize: 16,
  },
});