import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../servicos/supabase';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function BaterPontoScreen() {
  const router = useRouter();
  const { user, locationEnabled } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pontosDoDia, setPontosDoDia] = useState({
    entrada: false,
    inicio_almoco: false,
    fim_almoco: false,
    saida: false
  });
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    // Carrega os pontos já batidos pelo usuário hoje
    carregarPontosDeHoje();
    
    // Tenta obter a localização atual se estiver habilitada
    if (locationEnabled) {
      obterLocalizacaoAtual();
    }
  }, [locationEnabled]);

  const obterLocalizacaoAtual = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('BaterPonto: Permissão de localização negada');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      console.log('BaterPonto: Localização atual obtida:', location.coords);
      setCurrentLocation(location.coords);
    } catch (error) {
      console.error('BaterPonto: Erro ao obter localização atual:', error);
    }
  };

  const carregarPontosDeHoje = async () => {
    try {
      // Obter o usuário logado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Erro ao identificar usuário:', userError);
        return;
      }

      // Obter a data atual no formato correto
      const hoje = new Date();
      const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0).toISOString();
      const dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString();

      // Buscar registros de hoje
      const { data, error } = await supabase
        .from('registros_ponto')
        .select('tipo, data_hora')
        .eq('user_id', user.id)
        .gte('data_hora', dataInicio)
        .lte('data_hora', dataFim);

      if (error) {
        console.error('Erro ao buscar pontos do dia:', error);
        return;
      }

      // Verificar quais tipos de ponto já foram registrados hoje
      const novoEstado = { ...pontosDoDia };
      data.forEach(registro => {
        novoEstado[registro.tipo] = true;
      });

      setPontosDoDia(novoEstado);
      console.log('Pontos já registrados hoje:', novoEstado);
    } catch (e) {
      console.error('Exceção ao carregar pontos do dia:', e);
    }
  };

  // Iniciar processo de bater ponto
  const baterPonto = async (tipoPonto) => {
    // Verificar se o ponto já foi registrado hoje
    if (pontosDoDia[tipoPonto]) {
      Alert.alert(
        'Ponto já registrado', 
        `Você já registrou o ponto de ${formatarTipoPonto(tipoPonto)} hoje.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Verificar se a localização está habilitada
    if (!locationEnabled) {
      Alert.alert(
        'Localização Desativada',
        'Para registrar seu ponto, é necessário ativar a localização. Deseja ativar agora?',
        [
          { text: 'Não', style: 'cancel' },
          { 
            text: 'Sim', 
            onPress: () => {
              router.push('/(app)/home');
            }
          }
        ]
      );
      return;
    }

    // Atualizar localização antes de prosseguir
    await obterLocalizacaoAtual();
    
    // Se tivermos localização, registrar o ponto
    if (currentLocation) {
      registrarPonto(tipoPonto);
    } else {
      Alert.alert(
        'Erro',
        'Não foi possível obter sua localização atual. Por favor, verifique se o GPS está ativado e tente novamente.',
        [{ text: 'OK' }]
      );
    }
  };

  const registrarPonto = async (tipoPonto) => {
    setLoading(true);
    
    try {
      if (!currentLocation) {
        // Tentar obter a localização uma última vez
        await obterLocalizacaoAtual();
        
        if (!currentLocation) {
          setLoading(false);
          Alert.alert(
            'Erro',
            'Não foi possível obter sua localização atual. Por favor, verifique se o GPS está ativado e tente novamente.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoading(false);
        Alert.alert('Erro', 'Você precisa estar logado para bater ponto.');
        return;
      }
      
      // Registrar o ponto
      const dataHora = new Date();
      
      // Preparar dados básicos do registro
      const registroData = {
        user_id: user.id,
        tipo: tipoPonto,
        data_hora: dataHora.toISOString(),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      };
      
      // Salvar no Supabase
      const { error } = await supabase
        .from('registros_ponto')
        .insert(registroData);
        
      setLoading(false);
      
      if (error) {
        console.error('Erro ao registrar ponto:', error);
        Alert.alert('Erro', 'Não foi possível registrar o ponto. Por favor, tente novamente.');
        return;
      }
      
      // Atualizar o estado local e mostrar mensagem de sucesso
      const novoEstado = { ...pontosDoDia };
      novoEstado[tipoPonto] = true;
      setPontosDoDia(novoEstado);
      
      Alert.alert(
        'Sucesso', 
        `Ponto de ${formatarTipoPonto(tipoPonto)} registrado com sucesso às ${formatarHora(dataHora)}.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      setLoading(false);
      console.error('Exceção ao registrar ponto:', e);
      Alert.alert('Erro', 'Ocorreu um erro ao registrar o ponto. Por favor, tente novamente.');
    }
  };
  
  const verificarFluxo = () => {
    if (!pontosDoDia.entrada) {
      return 'entrada';
    } else if (pontosDoDia.entrada && !pontosDoDia.inicio_almoco) {
      return 'inicio_almoco';
    } else if (pontosDoDia.inicio_almoco && !pontosDoDia.fim_almoco) {
      return 'fim_almoco';
    } else if (pontosDoDia.fim_almoco && !pontosDoDia.saida) {
      return 'saida';
    }
    return null;
  };
  
  const formatarTipoPonto = (tipo) => {
    switch (tipo) {
      case 'entrada': return 'Entrada';
      case 'inicio_almoco': return 'Início do Almoço';
      case 'fim_almoco': return 'Fim do Almoço';
      case 'saida': return 'Saída';
      default: return tipo;
    }
  };
  
  const formatarHora = (data) => {
    return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
  };
  
  const renderBotaoPonto = () => {
    const proximoPonto = verificarFluxo();
    
    if (!proximoPonto) {
      return (
        <View style={styles.allDoneContainer}>
          <Ionicons name="checkmark-circle" size={50} color="#00E0FF" />
          <Text style={styles.allDoneText}>Todos os pontos do dia foram registrados</Text>
        </View>
      );
    }
    
    return (
      <TouchableOpacity
        onPress={() => baterPonto(proximoPonto)}
        disabled={loading}
        style={styles.registrarButton}
      >
        <LinearGradient
          colors={['#015C99', '#007BFF']}
          style={styles.buttonGradient}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="location" size={30} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Registrar {formatarTipoPonto(proximoPonto)}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };
  
  const renderStatusLocalizacao = () => {
    return (
      <View style={styles.locationStatusContainer}>
        <Ionicons 
          name={locationEnabled ? "location" : "location-outline"} 
          size={24} 
          color={locationEnabled ? "#00E0FF" : "#FF3B30"} 
        />
        <Text style={[
          styles.locationStatusText,
          { color: locationEnabled ? "#00E0FF" : "#FF3B30" }
        ]}>
          {locationEnabled ? "Localização ativada" : "Localização desativada"}
        </Text>
      </View>
    );
  };
  
  const renderPontosRegistrados = () => {
    const tiposPonto = ['entrada', 'inicio_almoco', 'fim_almoco', 'saida'];
    
    return (
      <View style={styles.registrosContainer}>
        <Text style={styles.registrosTitle}>Pontos Registrados Hoje</Text>
        
        {tiposPonto.map((tipo) => (
          <View key={tipo} style={styles.registroItem}>
            <Ionicons 
              name={pontosDoDia[tipo] ? "checkmark-circle" : "timer-outline"} 
              size={24} 
              color={pontosDoDia[tipo] ? "#00E0FF" : "#888888"} 
            />
            <Text style={[
              styles.registroText,
              { color: pontosDoDia[tipo] ? "#FFFFFF" : "#888888" }
            ]}>
              {formatarTipoPonto(tipo)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Registro de Ponto</Text>
          {renderStatusLocalizacao()}
        </View>
        
        <View style={styles.content}>
          {renderPontosRegistrados()}
          
          <View style={styles.actionContainer}>
            {renderBotaoPonto()}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 40,
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0, 224, 255, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  locationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  locationStatusText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  registrosContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  registrosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  registroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  registroText: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: 'monospace',
  },
  actionContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  registrarButton: {
    width: '100%',
    height: 70,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#00E0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  allDoneContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 15,
    width: '100%',
  },
  allDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    fontFamily: 'monospace',
  },
});