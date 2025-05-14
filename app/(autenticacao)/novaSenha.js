import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../servicos/supabase';

export default function NovaSenhaScreen() {
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [token, setToken] = useState(null);
  const [sessaoValida, setSessaoValida] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extrair parâmetros da URL no carregamento da tela
  useEffect(() => {
    console.log('Parâmetros recebidos na tela Nova Senha:', JSON.stringify(params));
    
    const verificarParametros = async () => {
      // Verificar se existem os parâmetros necessários para redefinição de senha
      if (params.access_token) {
        console.log('Token de acesso encontrado na URL');
        setToken(params.access_token);
        
        // Definir sessão com o token recebido para permitir a alteração de senha
        try {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token || ''
          });
          
          if (error) {
            console.error('Erro ao definir sessão:', error);
            Alert.alert(
              'Erro de Autenticação', 
              'O link de redefinição pode ter expirado. Solicite um novo link.',
              [{ text: 'OK', onPress: () => router.replace('/(autenticacao)/recuperarSenha') }]
            );
          } else {
            console.log('Sessão definida com sucesso para alteração de senha');
            setSessaoValida(true);
          }
        } catch (e) {
          console.error('Exceção ao definir sessão:', e);
          Alert.alert(
            'Erro Inesperado',
            'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
            [{ text: 'OK', onPress: () => router.replace('/(autenticacao)/recuperarSenha') }]
          );
        }
      } else if (params.error_description) {
        // Se houver erro na URL, alerta o usuário
        Alert.alert(
          'Erro no Processo', 
          params.error_description || 'Ocorreu um erro ao processar sua solicitação.',
          [{ text: 'OK', onPress: () => router.replace('/(autenticacao)/recuperarSenha') }]
        );
      } else {
        // Se não houver token nem erro, verificar se o usuário está autenticado
        checkAuth();
      }
    };
    
    verificarParametros();
  }, [params]);

  // Verificar se usuário está autenticado para permitir redefinição de senha
  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      console.log('Usuário não autenticado na tela de nova senha');
      Alert.alert(
        'Acesso não Autorizado', 
        'Por favor, use o link enviado ao seu email para redefinir sua senha.',
        [{ text: 'OK', onPress: () => router.replace('/(autenticacao)/recuperarSenha') }]
      );
    } else {
      console.log('Usuário autenticado, pode redefinir senha');
      setSessaoValida(true);
    }
  };

  const validarSenha = (senha) => {
    return senha.length >= 6; // Senha deve ter pelo menos 6 caracteres
  };

  const redefinirSenha = async () => {
    // Validações básicas
    if (!senha || !confirmarSenha) {
      Alert.alert('Campos obrigatórios', 'Por favor, preencha todos os campos.');
      return;
    }

    if (!validarSenha(senha)) {
      Alert.alert('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert('Senhas não coincidem', 'A senha e a confirmação de senha devem ser iguais.');
      return;
    }

    setCarregando(true);
    try {
      // Atualiza a senha do usuário
      const { error } = await supabase.auth.updateUser({
        password: senha
      });

      if (error) {
        console.error('Erro ao redefinir senha:', error);
        Alert.alert('Erro ao Redefinir Senha', error.message || 'Não foi possível redefinir sua senha. Tente novamente.');
      } else {
        Alert.alert(
          'Senha Redefinida', 
          'Sua senha foi alterada com sucesso. Você já pode fazer login com sua nova senha.',
          [{ text: 'OK', onPress: () => {
            // Logout após redefinir senha para limpar a sessão
            supabase.auth.signOut().then(() => {
              router.replace('/(autenticacao)/login');
            });
          }}]
        );
      }
    } catch (e) {
      console.error('Exceção ao redefinir senha:', e);
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
        <Text style={estilos.titulo}>Nova Senha</Text>
        
        <TextInput
          style={estilos.input}
          placeholder="Nova Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholderTextColor="#888"
        />
        
        <TextInput
          style={estilos.input}
          placeholder="Confirmar Nova Senha"
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          secureTextEntry
          placeholderTextColor="#888"
        />
        
        <TouchableOpacity 
          style={estilos.redefinirButton}
          onPress={redefinirSenha} 
          disabled={carregando || !sessaoValida}
        >
          <LinearGradient
            colors={['#0090D9', '#00E0FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={estilos.gradient}
          >
            <Text style={estilos.redefinirButtonText}>
              {carregando ? "Processando..." : "Redefinir Senha"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {!sessaoValida && (
          <Text style={estilos.aviso}>
            Aguardando validação do token de recuperação...
          </Text>
        )}
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
  redefinirButton: {
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
  redefinirButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  aviso: {
    color: '#FFA500',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
  }
});