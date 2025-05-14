import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../servicos/supabase';
import LocationPermissionModal from '../../componentes/LocationPermissionModal';
import { useAuth } from '../../context/AuthContext';

export default function TelaLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();
  const { showPermissionModal } = useAuth();

  async function fazerLogin() {
    setCarregando(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        Alert.alert('Erro ao Entrar', error.message);
        return;
      }

      if (data.user) {
        console.log('Login bem-sucedido:', data.user.email);
      }
    } catch (e) {
      Alert.alert('Erro Inesperado', 'Verifique sua conexão e tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <LinearGradient colors={['#0A0A18', '#1C1C2E', '#121236']} style={estilos.container}>
      <LocationPermissionModal />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={estilos.contentContainer}
      >
        <Text style={estilos.titulo}>Login</Text>
        <Text style={estilos.subtitulo}>Entre com sua conta</Text>

        <TextInput
          style={estilos.input}
          placeholder="E-mail"
          placeholderTextColor="#A0A0A0"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={estilos.input}
          placeholder="Senha"
          placeholderTextColor="#A0A0A0"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          style={estilos.botao}
          onPress={fazerLogin}
          disabled={carregando}
        >
          <LinearGradient colors={['#015C99', '#007BFF']} style={estilos.botaoGradiente}>
            <Text style={estilos.textoBotao}>{carregando ? 'Entrando...' : 'Entrar'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(autenticacao)/cadastro')}>
          <Text style={estilos.link}>Não tem uma conta? Cadastre-se</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(autenticacao)/recuperarSenha')}>
          <Text style={estilos.link}>Esqueceu sua senha?</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    padding: 25,
  },
  titulo: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#00E0FF',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0, 224, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitulo: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  input: {
    width: '85%',
    height: 50,
    backgroundColor: '#2A2A3A',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    fontSize: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#3A3A4A',
    fontFamily: 'monospace',
  },
  botao: {
    width: '85%',
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 20,
    elevation: 5,
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  botaoGradiente: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotao: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  link: {
    color: '#00E0FF',
    fontSize: 16,
    marginVertical: 10,
    fontFamily: 'monospace',
  },
});