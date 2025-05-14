import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../servicos/supabase';
import LocationPermissionModal from '../../componentes/LocationPermissionModal';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function TelaHome() {
  const router = useRouter();
  const { user, locationEnabled, setShowPermissionModal } = useAuth();
  const [carregandoLogout, setCarregandoLogout] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');

  useEffect(() => {
    console.log('Home: Estado inicial - locationEnabled:', locationEnabled, 'Usuário:', user?.id);
    const getUsuario = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        const nomeCompleto = data.user.user_metadata?.nome_completo;
        setNomeUsuario(nomeCompleto || data.user.email?.split('@')[0] || '');
      }
    };
    getUsuario();
  }, []);

  const fazerLogout = async () => {
    setCarregandoLogout(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Erro ao Sair', error.message);
      }
    } catch (e) {
      Alert.alert('Erro Inesperado', 'Verifique sua conexão.');
    } finally {
      setCarregandoLogout(false);
    }
  };

  return (
    <LinearGradient colors={['#0A0A18', '#1C1C2E', '#121236']} style={estilos.container}>
      <LocationPermissionModal />
      <View style={estilos.contentContainer}>
        <View style={estilos.header}>
          <Text style={estilos.titulo}>Tela Inicial</Text>
          <Ionicons
            name={locationEnabled ? 'location' : 'location-outline'}
            size={24}
            color={locationEnabled ? '#00E0FF' : '#FF6347'}
            style={estilos.gpsIcon}
          />
        </View>
        {user && <Text style={estilos.welcomeText}>Bem-vindo, {nomeUsuario}</Text>}
        <TouchableOpacity onPress={() => router.push('/(app)/baterPonto')} style={estilos.actionButton}>
          <LinearGradient colors={['#015C99', '#007BFF']} style={estilos.gradient}>
            <Text style={estilos.actionButtonText}>Bater o Ponto</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(app)/historicoPonto')} style={estilos.actionButton}>
          <LinearGradient colors={['#015C99', '#007BFF']} style={estilos.gradient}>
            <Text style={estilos.actionButtonText}>Histórico de Ponto</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={[estilos.actionButton, estilos.logoutButton]}
          onPress={fazerLogout}
          disabled={carregandoLogout}
        >
          <LinearGradient colors={['#D93B3B', '#FF6347']} style={estilos.gradient}>
            <Text style={estilos.actionButtonText}>{carregandoLogout ? 'Saindo...' : 'Logout'}</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    alignItems: 'center',
    padding: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#00E0FF',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0, 224, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  actionButton: {
    width: '85%',
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 12,
    elevation: 5,
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  logoutButton: {
    marginTop: 30,
    shadowColor: '#FF6347',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  gpsIcon: {
    marginLeft: 10,
  },
});