import { Stack, useRouter } from 'expo-router';
import { Button } from 'react-native';
import { supabase } from '../../servicos/supabase'; // Ajuste o caminho se necessário

export default function AppLayout() {
  const router = useRouter();

  const fazerLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao fazer logout:', error.message);
      alert('Erro ao fazer logout: ' + error.message);
    } else {
      router.replace('/(autenticacao)/login');
    }
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#121220', // Cor de fundo do header futurista para app
        },
        headerTintColor: '#00E0FF', // Cor do texto e botão de voltar no header
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="home" 
        options={{
          title: 'Tela Inicial',
          headerRight: () => (
            <Button onPress={fazerLogout} title="Sair" color="#FF6347" />
          ),
          headerLeft: () => null, // Remove o botão de voltar da tela home
        }} 
      />
      {/* Outras telas da área logada podem ser adicionadas aqui */}
    </Stack>
  );
}

