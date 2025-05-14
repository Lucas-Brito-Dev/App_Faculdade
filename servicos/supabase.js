// const supabaseUrl = "https://wqrnrxaxwitmkapfmvpl.supabase.co";
// const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxcm5yeGF4d2l0bWthcGZtdnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4ODUzMTEsImV4cCI6MjA2MjQ2MTMxMX0.99d8ZjeNtDVIMEVj2CUUsxVbYZnk-59OQSYS1kPhX3Q";


// supabase.js
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

// Uncomment these lines and replace with your actual Supabase credentials
const supabaseUrl = "https://jdxirshxxjkzqmamcmlr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkeGlyc2h4eGprenFtYW1jbWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTc0MTIsImV4cCI6MjA2Mjc3MzQxMn0.l-xnmSosykOQWdmP8IUa4KVYUu94kRu14AA51hYyj08";

// Create and export the Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // We'll handle this manually
    },
  }
);

// Função para registro de usuário com nome completo
export async function registrarUsuario(email, senha, nomeCompleto) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: senha,
      options: {
        data: {
          nome_completo: nomeCompleto,
        }
      }
    });
    
    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return { error };
  }
}

// Function to get the redirect URL
export function getRedirectUrl() {
  // Use o scheme definido no app.json
  const scheme = "seuapp"; // Atualize para o mesmo valor que você usou no app.json
  
  // Construa a URL completa de redirecionamento
  // Isso garante que o formato seja: seuapp://novaSenha
  return `${scheme}://novaSenha`;
}

// Password recovery function that includes the correct redirect URL
export async function recuperarSenha(email) {
  try {
    const redirectTo = getRedirectUrl();
    console.log('Redirect URL for recovery:', redirectTo);
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error recovering password:', error);
    return { error, success: false };
  }
}

// Set up deep link listener for when the app is already open
export function configurarDeepLinkListener(callback) {
  return Linking.addEventListener('url', ({ url }) => {
    console.log('Deep link received (app open):', url);
    processarUrl(url, callback);
  });
}

// Check if the app was opened by a deep link
export async function verificarLinkInicial(callback) {
  try {
    const url = await Linking.getInitialURL();
    console.log('Initial URL:', url);
    if (url) {
      processarUrl(url, callback);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error checking initial URL:', e);
    return false;
  }
}

// Function to process the received URL and extract relevant parameters
function processarUrl(url, callback) {
  try {
    // Parse the URL and extract parameters
    const parsedUrl = Linking.parse(url);
    console.log('Parsed URL:', parsedUrl);
    
    // If there are tokens in the URL, extract them
    const { queryParams } = parsedUrl;
    const authParams = {};
    
    if (queryParams?.access_token) {
      authParams.access_token = queryParams.access_token;
    }
    
    if (queryParams?.refresh_token) {
      authParams.refresh_token = queryParams.refresh_token;
    }
    
    if (queryParams?.type) {
      authParams.type = queryParams.type;
    }
    
    if (Object.keys(authParams).length > 0) {
      console.log('Authentication parameters found:', Object.keys(authParams));
      
      // Notify the callback with the extracted parameters
      if (callback && typeof callback === 'function') {
        callback(authParams);
      }
    }
  } catch (e) {
    console.error('Error processing deep link URL:', e);
  }
}