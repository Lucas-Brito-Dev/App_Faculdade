import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { requestLocationPermissions, startLocationMonitoring, checkLocationEnabled } from '../servicos/location';
import { Ionicons } from '@expo/vector-icons';

export default function LocationPermissionModal() {
  const { 
    user, 
    showPermissionModal, 
    setShowPermissionModal, 
    setLocationEnabled,
    locationServicesEnabled,
    retryLocationMonitoring
  } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [isLocationServiceDisabled, setIsLocationServiceDisabled] = useState(false);

  // Verificar estado dos serviços de localização quando o modal é aberto
  useEffect(() => {
    if (showPermissionModal) {
      checkDeviceLocationServices();
    }
  }, [showPermissionModal]);

  const checkDeviceLocationServices = async () => {
    try {
      const enabled = await checkLocationEnabled();
      setIsLocationServiceDisabled(!enabled);
    } catch (e) {
      console.error('Modal: Erro ao verificar serviços de localização:', e);
      setIsLocationServiceDisabled(true);
    }
  };

  const abrirConfiguracoes = () => {
    try {
      if (Platform.OS === 'ios') {
        Linking.openURL('App-Prefs:Privacy&path=LOCATION');
      } else {
        Linking.openSettings();
      }
    } catch (e) {
      console.error('Modal: Erro ao abrir configurações:', e);
      alert('Não foi possível abrir as configurações. Por favor, ative a localização manualmente nas configurações do seu dispositivo.');
    }
  };

  const solicitarPermissao = async () => {
    try {
      setLoading(true);
      console.log('Modal: Solicitando permissões de localização...');
      
      // Verificar primeiro se os serviços de localização estão ativos
      const locationServicesEnabled = await checkLocationEnabled();
      
      if (!locationServicesEnabled) {
        setIsLocationServiceDisabled(true);
        alert('Por favor, ative os serviços de localização nas configurações do seu dispositivo antes de continuar.');
        return;
      }
      
      const { granted } = await requestLocationPermissions();
      
      if (granted && user?.id) {
        console.log('Modal: Permissões concedidas, iniciando monitoramento para usuário:', user.id);
        const result = await startLocationMonitoring(user.id);
        
        if (result.success) {
          console.log('Modal: Monitoramento iniciado com sucesso');
          setLocationEnabled(true);
          setShowPermissionModal(false);
        } else {
          console.error('Modal: Falha ao iniciar monitoramento:', result.error);
          alert('Erro ao iniciar monitoramento: ' + result.error);
          
          if (result.error === 'Serviços de localização desativados') {
            setIsLocationServiceDisabled(true);
          }
        }
      } else {
        console.log('Modal: Permissões negadas ou usuário não autenticado');
        if (!granted) {
          alert('Para usar o aplicativo corretamente, você precisa conceder permissão de localização nas configurações do seu dispositivo.');
        }
      }
    } catch (e) {
      console.error('Modal: Erro ao solicitar permissões:', e);
      alert('Ocorreu um erro ao solicitar permissões: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const tenteNovamente = async () => {
    setLoading(true);
    try {
      await checkDeviceLocationServices();
      if (!isLocationServiceDisabled) {
        await retryLocationMonitoring();
      } else {
        alert('Por favor, ative os serviços de localização antes de tentar novamente.');
      }
    } catch (e) {
      console.error('Modal: Erro ao tentar novamente:', e);
    } finally {
      setLoading(false);
    }
  };

  const fecharModal = () => {
    console.log('Modal: Fechando modal sem permissões');
    setShowPermissionModal(false);
  };

  if (!showPermissionModal) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showPermissionModal}
      onRequestClose={fecharModal}
    >
      <View style={styles.modalBackground}>
        <LinearGradient
          colors={['#1A1A2E', '#16213E', '#0F3460']}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Ionicons name="location" size={50} color="#00E0FF" style={styles.locationIcon} />
            <Text style={styles.modalTitle}>Localização Necessária</Text>
          </View>

          <View style={styles.divider} />

          {isLocationServiceDisabled ? (
            <>
              <Text style={styles.modalText}>
                Os serviços de localização estão desativados no seu dispositivo.
              </Text>
              <Text style={styles.detailText}>
                Por favor, ative a localização nas configurações do seu dispositivo para poder registrar seu ponto corretamente.
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={abrirConfiguracoes} style={styles.primaryButton} disabled={loading}>
                  <LinearGradient colors={['#015C99', '#007BFF']} style={styles.gradient}>
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Abrir Configurações</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={tenteNovamente} style={styles.primaryButton} disabled={loading}>
                  <LinearGradient colors={['#4CAF50', '#388E3C']} style={styles.gradient}>
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Tentar Novamente</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.modalText}>
                Para o funcionamento completo do aplicativo de ponto, precisamos da sua permissão para acessar a localização do dispositivo.
              </Text>
              <Text style={styles.detailText}>
                Isso nos permite verificar sua presença no local de trabalho quando você registra o ponto.
                Sua localização será monitorada apenas durante seu expediente.
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={solicitarPermissao} style={styles.primaryButton} disabled={loading}>
                  <LinearGradient colors={['#015C99', '#007BFF']} style={styles.gradient}>
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Permitir Acesso</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={fecharModal} style={styles.secondaryButton} disabled={loading}>
                  <Text style={styles.secondaryButtonText}>Agora Não</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={styles.noteText}>
            Você pode alterar essa configuração a qualquer momento nas configurações do seu dispositivo.
          </Text>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#00E0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 224, 255, 0.3)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  locationIcon: {
    marginBottom: 10,
    textShadowColor: 'rgba(0, 224, 255, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00E0FF',
    textAlign: 'center',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0, 224, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 224, 255, 0.3)',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'monospace',
    lineHeight: 22,
  },
  detailText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 25,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 15,
  },
  primaryButton: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#00E0FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  secondaryButton: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#AAAAAA',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  noteText: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    fontFamily: 'monospace',
    fontStyle: 'italic',
  },
});