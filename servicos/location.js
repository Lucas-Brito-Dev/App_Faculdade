import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabase';
import { Platform, Alert } from 'react-native';

// Nome da tarefa em segundo plano
const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_TRACKING_INTERVAL = 1000; // 1 minuto
const LOCATION_TRACKING_DISTANCE = 10; // 10 metros
const GPS_CHECK_INTERVAL = 1000; // 1 segundo para verificação do GPS

// Flag para rastrear se o monitoramento está ativo
let isMonitoringActive = false;
let watchSubscription = null;
let currentUserId = null;

// Registrar a tarefa em segundo plano
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('TaskManager: Erro na tarefa de localização:', error);
    return;
  }
  
  if (!data) {
    console.log('TaskManager: Sem dados de localização');
    return;
  }
  
  const { locations } = data;
  
  if (!locations || locations.length === 0) {
    console.log('TaskManager: Array de localizações vazio');
    return;
  }
  
  try {
    // Pegar a localização mais recente
    const location = locations[locations.length - 1];
    
    if (!currentUserId) {
      console.error('TaskManager: userId não definido, não é possível salvar localização');
      return;
    }
    
    // Salvar localização no Supabase
    await saveLocationToDatabase(location, currentUserId);
    
    console.log('TaskManager: Localização salva com sucesso');
  } catch (e) {
    console.error('TaskManager: Erro ao processar localização em segundo plano:', e);
  }
});

// Função para salvar localização no banco de dados
async function saveLocationToDatabase(location, userId) {
  try {
    const { coords, timestamp } = location;
    
    console.log(`Salvando localização: ${coords.latitude}, ${coords.longitude} para usuário ${userId}`);
    
    // Usar a função do Supabase para registrar a localização
    const { data, error } = await supabase.rpc('registrar_localizacao', {
      p_user_id: userId,
      p_latitude: coords.latitude,
      p_longitude: coords.longitude,
      p_precisao: coords.accuracy || null
    });
    
    // Caso a função RPC não funcione, tenta inserir diretamente
    if (error) {
      console.warn('Erro ao usar RPC registrar_localizacao:', error);
      
      // Tentar inserção direta
      const { error: insertError } = await supabase
        .from('registros_localizacao')
        .insert({
          user_id: userId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          precisao: coords.accuracy || null,
          timestamp: new Date(timestamp).toISOString()
        });
        
      if (insertError) {
        console.error('Erro ao salvar localização no Supabase:', insertError);
        return { success: false, error: insertError };
      }
    }
    
    return { success: true };
  } catch (e) {
    console.error('Exceção ao salvar localização:', e);
    return { success: false, error: e.message };
  }
}

// Verificar se a localização está habilitada no dispositivo
export async function checkLocationEnabled() {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    console.log('location.js: Serviços de localização estão habilitados:', enabled);
    
    return enabled;
  } catch (e) {
    console.error('location.js: Erro ao verificar serviços de localização:', e);
    return false;
  }
}

// Função para solicitar permissões de localização
export async function requestLocationPermissions() {
  try {
    console.log('location.js: Solicitando permissões de localização');
    
    // Verificar se a localização está habilitada no dispositivo
    const locationEnabled = await checkLocationEnabled();
    if (!locationEnabled) {
      console.log('location.js: Serviços de localização desativados no dispositivo');
      Alert.alert(
        "Localização Desativada",
        "A localização está desativada no seu dispositivo. Por favor, ative a localização nas configurações do dispositivo.",
        [{ text: "OK" }]
      );
      return { granted: false, error: 'Serviços de localização desativados' };
    }
    
    // Solicitar permissão de localização em primeiro plano
    const foregroundPermission = await Location.requestForegroundPermissionsAsync();
    
    if (!foregroundPermission.granted) {
      console.log('location.js: Permissão em primeiro plano negada');
      return { granted: false, error: 'Permissão de localização negada' };
    }
    
    // Em iOS, as permissões de segundo plano são diferentes
    if (Platform.OS === 'ios') {
      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
      
      if (!backgroundPermission.granted) {
        console.log('location.js: Permissão em segundo plano negada (iOS)');
        // Continuamos mesmo sem permissão em segundo plano no iOS
        console.log('location.js: Continuando apenas com permissão em primeiro plano no iOS');
      }
    }
    
    console.log('location.js: Todas as permissões concedidas');
    return { granted: true };
  } catch (e) {
    console.error('location.js: Erro ao solicitar permissões:', e);
    return { granted: false, error: e.message };
  }
}

// Função para iniciar o monitoramento de localização
export async function startLocationMonitoring(userId) {
  try {
    console.log('location.js: Iniciando monitoramento para userId:', userId);
    
    if (!userId) {
      console.log('location.js: UserId não fornecido, não é possível iniciar monitoramento');
      return { success: false, error: 'ID de usuário não fornecido' };
    }
    
    // Verificar se a localização está habilitada no dispositivo
    const locationEnabled = await checkLocationEnabled();
    if (!locationEnabled) {
      console.log('location.js: Serviços de localização desativados');
      Alert.alert(
        "Localização Desativada",
        "A localização está desativada no seu dispositivo. Por favor, ative a localização nas configurações do dispositivo e tente novamente.",
        [{ text: "OK" }]
      );
      return { success: false, error: 'Serviços de localização desativados' };
    }
    
    if (isMonitoringActive) {
      console.log('location.js: Monitoramento já está ativo, parando primeiro');
      await stopLocationMonitoring();
    }
    
    // Guardar o userId para uso na tarefa em segundo plano
    currentUserId = userId;
    
    // Verificar permissões antes de iniciar o monitoramento
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      console.log('location.js: Sem permissões em primeiro plano para iniciar monitoramento');
      return { success: false, error: 'Permissões de localização não concedidas' };
    }
    
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
    console.log('location.js: Status da permissão de background:', backgroundStatus);
    
    // Configurar a precisão da localização
    if (process.env.GOOGLE_MAPS_API_KEY) {
      await Location.setGoogleApiKey(process.env.GOOGLE_MAPS_API_KEY);
    }
    
    try {
      await Location.enableNetworkProviderAsync();
    } catch (e) {
      console.log('location.js: Erro ao habilitar provedor de rede, continuando mesmo assim:', e.message);
    }
    
    // Obter localização atual antes de iniciar o monitoramento contínuo
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      console.log('location.js: Localização atual obtida:', currentLocation.coords);
      await saveLocationToDatabase(currentLocation, userId);
    } catch (e) {
      console.warn('location.js: Não foi possível obter localização atual:', e.message);
      // Continuamos mesmo sem conseguir obter a localização atual
    }
    
    // Iniciar monitoramento em tempo real
    console.log('location.js: Iniciando watchPositionAsync');
    watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_TRACKING_INTERVAL,
        distanceInterval: LOCATION_TRACKING_DISTANCE,
      },
      async (location) => {
        console.log('location.js: Nova localização recebida:', location.coords);
        await saveLocationToDatabase(location, userId);
      }
    );
    
    // Iniciar monitoramento em segundo plano (se tiver permissão)
    if (backgroundStatus === 'granted') {
      console.log('location.js: Iniciando tarefa em segundo plano');
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_TRACKING_INTERVAL,
        distanceInterval: LOCATION_TRACKING_DISTANCE,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Monitoramento de Ponto",
          notificationBody: "Seu local está sendo monitorado para registro de ponto",
          notificationColor: "#00E0FF",
        },
      });
    } else {
      console.log('location.js: Sem permissão para monitoramento em segundo plano, usando apenas primeiro plano');
    }
    
    isMonitoringActive = true;
    console.log('location.js: Monitoramento iniciado com sucesso');
    
    return { success: true };
  } catch (e) {
    console.error('location.js: Erro ao iniciar monitoramento:', e);
    return { success: false, error: e.message };
  }
}

// Função para parar o monitoramento de localização
export async function stopLocationMonitoring() {
  try {
    console.log('location.js: Parando monitoramento');
    
    // Parar monitoramento em tempo real
    if (watchSubscription) {
      watchSubscription.remove();
      watchSubscription = null;
    }
    
    // Verificar se a tarefa em segundo plano está registrada
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    
    if (isTaskRegistered) {
      console.log('location.js: Parando tarefa em segundo plano');
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    
    isMonitoringActive = false;
    currentUserId = null;
    console.log('location.js: Monitoramento parado com sucesso');
    
    return { success: true };
  } catch (e) {
    console.error('location.js: Erro ao parar monitoramento:', e);
    return { success: false, error: e.message };
  }
}

// Função para verificar se o monitoramento está ativo
export async function isLocationMonitoringActive() {
  try {
    // Verificar se o monitoramento em primeiro plano está ativo
    if (watchSubscription) {
      return true;
    }
    
    // Verificar se a tarefa em segundo plano está registrada
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    
    return isMonitoringActive || isTaskRegistered;
  } catch (e) {
    console.error('location.js: Erro ao verificar status do monitoramento:', e);
    return false;
  }
}