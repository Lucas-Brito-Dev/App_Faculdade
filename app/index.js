import { Redirect } from "expo-router";

// Este componente serve como ponto de entrada inicial.
// A lógica em app/_layout.js cuidará do redirecionamento
// com base no estado de autenticação.
// Redirecionar para a tela de login por padrão se nenhuma outra lógica
// no _layout.js tiver assumido o controle ainda.
export default function TelaInicial() {
  return <Redirect href="/(autenticacao)/login" />;
}

