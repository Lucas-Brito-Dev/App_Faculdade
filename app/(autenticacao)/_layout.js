import { Stack } from 'expo-router';

export default function AutenticacaoLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1C1C2E', // Cor de fundo do header futurista
        },
        headerTintColor: '#00E0FF', // Cor do texto e botão de voltar no header
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackTitleVisible: false, // Oculta o texto do botão de voltar no iOS, mostrando apenas o ícone
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="cadastro" options={{ title: 'Criar Conta' }} />
      <Stack.Screen name="recuperarSenha" options={{ title: 'Recuperar Senha' }} />
    </Stack>
  );
}

