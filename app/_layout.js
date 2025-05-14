import { Slot, SplashScreen, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { supabase, verificarLinkInicial, configurarDeepLinkListener } from "../servicos/supabase";
import * as SecureStore from 'expo-secure-store';
import { AuthProvider } from '../context/AuthContext';

// Garante que qualquer erro lançado pelo Layout seja capturado pelo Error Boundary.
export { ErrorBoundary } from 'expo-router';

// Impede que a tela de splash seja ocultada automaticamente antes que a lógica de autenticação seja concluída.
SplashScreen.preventAutoHideAsync();

export default function LayoutRaiz() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [resetParams, setResetParams] = useState(null);
  const router = useRouter();
  const segmentos = useSegments();

  // Função para lidar com parâmetros de autenticação de deep links
  const handleAuthParams = (params) => {
    console.log("Parâmetros de autenticação recebidos:", params);
    if (params?.access_token && params?.type === 'recovery') {
      setResetParams(params);
      router.replace({
        pathname: '/(autenticacao)/novaSenha',
        params: params
      });
    }
  };

  useEffect(() => {
    const verificarSessaoAtual = async () => {
      try {
        const { data: { session: sessaoAtual }, error } = await supabase.auth.getSession();
        if (error) throw error;
        console.log("Sessão inicial verificada:", sessaoAtual ? "Autenticado" : "Não autenticado");
        setSessao(sessaoAtual);
      } catch (e) {
        console.error("Erro ao buscar sessão inicial:", e);
      } finally {
        verificarLinkInicial(handleAuthParams).then(() => {
          setCarregando(false);
          SplashScreen.hideAsync();
        });
      }
    };

    verificarSessaoAtual();

    const subscription = configurarDeepLinkListener(handleAuthParams);

    const { data: { subscription: listener } } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      console.log("Auth state mudou:", evento, novaSessao?.user?.email || "sem usuário");
      setSessao(novaSessao);
      
      if (evento === 'SIGNED_IN') {
        console.log("Redirecionando para home após login");
        router.replace('/(app)/home');
      } else if (evento === 'SIGNED_OUT') {
        console.log("Redirecionando para login após logout");
        router.replace('/(autenticacao)/login');
      } else if (evento === 'PASSWORD_RECOVERY') {
        console.log("Evento de recuperação de senha detectado");
      }
    });

    return () => {
      listener?.unsubscribe();
      subscription?.remove();
    };
  }, [router]);

  useEffect(() => {
    if (carregando) return;

    if (resetParams) return;

    const emGrupoAutenticacao = segmentos[0] === "(autenticacao)";
    const emGrupoApp = segmentos[0] === "(app)";
    const emNovaSenha = segmentos.includes("novaSenha");

    console.log("Rota atual:", segmentos.join('/'), 
      "| Autenticado:", !!sessao, 
      "| Em grupo auth:", emGrupoAutenticacao,
      "| Em grupo app:", emGrupoApp,
      "| Em nova senha:", emNovaSenha);

    if (emNovaSenha) {
      console.log("Na tela de nova senha, não redirecionando");
      return;
    }

    if (sessao && !emGrupoApp) {
      console.log("Redirecionando usuário logado para home");
      router.replace("/(app)/home");
    } else if (!sessao && !emGrupoAutenticacao) {
      console.log("Redirecionando usuário não logado para login");
      router.replace("/(autenticacao)/login");
    }
  }, [sessao, carregando, segmentos, router, resetParams]);

  if (carregando) {
    return null;
  }

  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}