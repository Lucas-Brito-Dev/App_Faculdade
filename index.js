// Importa polyfills e dependências globais necessárias
import 'react-native-get-random-values';

// Importa o ponto de entrada do Expo Router.
// Isto deve registrar o componente raiz da aplicação.
import 'expo-router/entry';

// A linha registerRootComponent(App) e a importação de App de './App' foram removidas.
// Com o uso de 'expo-router/entry', o Expo Router gerencia o componente raiz.
// O arquivo App.js, como estava (apenas com importações), não precisa mais ser
// importado aqui para fornecer um componente, pois 'expo-router/entry' já faz o necessário.

