import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../servicos/supabase';
import { 
  requestLocationPermissions, 
  startLocationMonitoring, 
  stopLocationMonitoring, 
  isLocationMonitoringActive,
  checkLocationEnabled
} from '../servicos/location';
import { Alert, AppState } from 'react-native';
import * as Location from 'expo-location';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(false);

  // Verificar o status dos serviços de localização do dispositivo
  const checkDeviceLocationStatus = async () => {
    try {
      const enabled = await checkLocationEnabled();
      console.log('AuthContext: Serviços de localização do dispositivo:', enabled ? 'ativados' : 'desativados');
      setLocationServicesEnabled(enabled);
      return enabled;
    } catch (error) {
      console.error('AuthContext: Erro ao verificar serviços de localização:', error);
      setLocationServicesEnabled(false);
      return false;
    }
  };

  // Monitorar mudanças no estado do aplicativo (foreground, background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('AuthContext: App state mudou:', appState, '->', nextAppState);
      setAppState(nextAppState);

      // Se o app voltar ao primeiro plano, verificar as permissões e status do monitoramento
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('AuthContext: App voltou ao primeiro plano, verificando monitoramento');
        checkDeviceLocationStatus();
        if (user?.id) {
          verifyMonitoringStatus(user.id);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [appState, user]);

  // Verificar se o monitoramento está ativo e reiniciar se necessário
  const verifyMonitoringStatus = async (userId) => {
    try {
      if (!userId) {
        console.log('AuthContext: Sem usuário, não verificando monitoramento');
        return;
      }

      // Verificar se os serviços de localização estão habilitados
      const deviceLocationEnabled = await checkDeviceLocationStatus();
      if (!deviceLocationEnabled) {
        console.log('AuthContext: Serviços de localização desativados no dispositivo');
        setLocationEnabled(false);
        setShowPermissionModal(true);
        return;
      }

      const active = await isLocationMonitoringActive();
      console.log('AuthContext: Status do monitoramento:', active ? 'ativo' : 'inativo');
      
      setLocationEnabled(active);
      
      if (!active) {
        console.log('AuthContext: Monitoramento inativo, verificando permissões');
        const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
        
        if (foregroundStatus === 'granted') {
          console.log('AuthContext: Permissões já concedidas, reiniciando monitoramento');
          const result = await startLocationMonitoring(userId);
          
          if (result.success) {
            console.log('AuthContext: Monitoramento reiniciado com sucesso');
            setLocationEnabled(true);
            setShowPermissionModal(false);
          } else {
            console.error('AuthContext: Falha ao reiniciar monitoramento:', result.error);
            if (result.error === 'Serviços de localização desativados') {
              setShowPermissionModal(true);
            }
          }
        } else {
          console.log('AuthContext: Permissões não concedidas, mostrando modal');
          setShowPermissionModal(true);
        }
      }
    } catch (e) {
      console.error('AuthContext: Erro ao verificar status do monitoramento:', e);
      setLocationEnabled(false);
    }
  };

  useEffect(() => {
    console.log('AuthContext: Verificando sessão inicial e serviços de localização');
    
    // Verificar serviços de localização do dispositivo
    checkDeviceLocationStatus();
    
    // Verificar sessão de autenticação
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: Sessão recebida:', session?.user?.id || 'Nenhum usuário');
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkLocationPermissions(session.user.id);
      } else {
        stopLocationMonitoring().then(() => {
          setLocationEnabled(false);
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state mudou:', event, session?.user?.email || 'sem usuário');
      
      if (event === 'SIGNED_OUT') {
        // Parar monitoramento quando o usuário sair
        const result = await stopLocationMonitoring();
        if (result.success) {
          console.log('AuthContext: Monitoramento parado após logout');
          setLocationEnabled(false);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Iniciar monitoramento quando o usuário entrar
        setUser(session.user);
        await checkLocationPermissions(session.user.id);
      }
      
      setUser(session?.user ?? null);
    });

    return () => {
      console.log('AuthContext: Limpando assinatura');
      subscription?.unsubscribe();
      stopLocationMonitoring();
    };
  }, []);

  async function checkLocationPermissions(userId) {
    console.log('AuthContext: Verificando permissões de localização, userId:', userId || 'Não autenticado');
    try {
      if (!userId) {
        console.log('AuthContext: Sem usuário, não verificando permissões');
        setLocationEnabled(false);
        return;
      }
      
      // Verificar se os serviços de localização estão habilitados
      const deviceLocationEnabled = await checkDeviceLocationStatus();
      if (!deviceLocationEnabled) {
        console.log('AuthContext: Serviços de localização desativados no dispositivo');
        setLocationEnabled(false);
        setShowPermissionModal(true);
        return;
      }
      
      const { granted, error } = await requestLocationPermissions();
      console.log('AuthContext: Resultado das permissões:', { granted, error });
      
      if (granted) {
        console.log('AuthContext: Permissões concedidas, iniciando monitoramento');
        const result = await startLocationMonitoring(userId);
        
        if (result.success) {
          console.log('AuthContext: Monitoramento iniciado com sucesso');
          setLocationEnabled(true);
          setShowPermissionModal(false);
        } else {
          console.error('AuthContext: Erro ao iniciar monitoramento:', result.error);
          setLocationEnabled(false);
          
          if (result.error === 'Serviços de localização desativados') {
            setShowPermissionModal(true);
          } else {
            Alert.alert(
              'Atenção',
              'Houve um problema ao iniciar o monitoramento de localização. Algumas funcionalidades podem estar limitadas.',
              [{ text: 'OK' }]
            );
          }
        }
      } else {
        console.log('AuthContext: Permissões não concedidas, exibindo modal');
        setLocationEnabled(false);
        setShowPermissionModal(true);
      }
    } catch (err) {
      console.error('AuthContext: Erro ao verificar permissões:', err);
      setLocationEnabled(false);
      setShowPermissionModal(true);
    }
  }
  
  // Função para tentar iniciar o monitoramento novamente
  const retryLocationMonitoring = async () => {
    if (user?.id) {
      await checkLocationPermissions(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      locationEnabled,
      showPermissionModal,
      setShowPermissionModal,
      setLocationEnabled,
      retryLocationMonitoring,
      locationServicesEnabled
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}