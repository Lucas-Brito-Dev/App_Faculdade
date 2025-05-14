import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Button, 
  RefreshControl, 
  Alert,
  TouchableOpacity,
  Modal,
  Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../servicos/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

const formatarTipoPonto = (tipo) => {
  switch (tipo) {
    case 'entrada':
      return 'Entrada';
    case 'inicio_almoco':
      return 'Início Almoço';
    case 'fim_almoco':
      return 'Fim Almoço';
    case 'saida':
      return 'Saída';
    default:
      return tipo;
  }
};

// Função para agrupar registros por data
const agruparRegistrosPorData = (registros) => {
  const grupos = {};
  
  registros.forEach(registro => {
    const data = new Date(registro.data_hora);
    const dataFormatada = data.toLocaleDateString('pt-BR');
    
    if (!grupos[dataFormatada]) {
      grupos[dataFormatada] = [];
    }
    
    grupos[dataFormatada].push(registro);
  });
  
  // Converter o objeto em um array para o FlatList
  return Object.keys(grupos)
    .sort((a, b) => {
      // Converter datas no formato dd/mm/yyyy para objetos Date para comparação
      const partsA = a.split('/');
      const partsB = b.split('/');
      
      // Criar datas no formato yyyy-mm-dd
      const dateA = new Date(`${partsA[2]}-${partsA[1]}-${partsA[0]}`);
      const dateB = new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`);
      
      // Ordenar de forma decrescente (mais recentes primeiro)
      return dateB - dateA;
    })
    .map(data => ({
      data,
      registros: grupos[data].sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora))
    }));
};

export default function HistoricoPontoScreen() {
  const router = useRouter();
  const [registros, setRegistros] = useState([]);
  const [registrosAgrupados, setRegistrosAgrupados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para o filtro de data
  const [dataFiltro, setDataFiltro] = useState(new Date());
  const [mostrarPicker, setMostrarPicker] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState(false);

  const fetchHistorico = async (dataFiltroParam = null) => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        Alert.alert('Erro', 'Não foi possível identificar o usuário.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      let query = supabase
        .from('registros_ponto')
        .select('*')
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false });
      
      // Aplicar filtro de data se necessário
      if (dataFiltroParam) {
        // Criar data no início do dia (00:00:00)
        const dataInicio = new Date(dataFiltroParam);
        dataInicio.setHours(0, 0, 0, 0);
        
        // Criar data no fim do dia (23:59:59)
        const dataFim = new Date(dataFiltroParam);
        dataFim.setHours(23, 59, 59, 999);
        
        // Converter para ISO String para garantir formato correto para o Supabase
        const dataInicioISO = dataInicio.toISOString();
        const dataFimISO = dataFim.toISOString();
        
        console.log(`Filtrando registros entre ${dataInicioISO} e ${dataFimISO}`);
        
        query = query
          .gte('data_hora', dataInicioISO)
          .lte('data_hora', dataFimISO);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        Alert.alert('Erro ao Buscar Histórico', error.message || 'Ocorreu um problema ao buscar os registros.');
        setRegistros([]);
        setRegistrosAgrupados([]);
      } else {
        console.log(`Registros encontrados: ${data ? data.length : 0}`);
        setRegistros(data || []);
        setRegistrosAgrupados(agruparRegistrosPorData(data || []));
      }
    } catch (e) {
      console.error('Exceção ao buscar histórico:', e);
      Alert.alert('Erro Crítico', 'Ocorreu uma exceção inesperada ao buscar o histórico.');
      setRegistros([]);
      setRegistrosAgrupados([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistorico(filtroAtivo ? dataFiltro : null);
    }, [filtroAtivo, dataFiltro])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistorico(filtroAtivo ? dataFiltro : null);
  };

  const aplicarFiltro = () => {
    setFiltroAtivo(true);
    fetchHistorico(dataFiltro);
    setMostrarPicker(false);
  };

  const limparFiltro = () => {
    setFiltroAtivo(false);
    fetchHistorico(null);
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || dataFiltro;
    setMostrarPicker(Platform.OS === 'ios');
    setDataFiltro(currentDate);
    
    // No Android, aplicamos o filtro imediatamente após a seleção
    if (Platform.OS === 'android') {
      setTimeout(() => {
        setFiltroAtivo(true);
        fetchHistorico(currentDate);
      }, 100);
    }
  };

  // Componente para renderizar cada registro
  const renderRegistro = (registro) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTipo}>{formatarTipoPonto(registro.tipo)}</Text>
      <Text style={styles.itemDataHora}>{
        new Date(registro.data_hora).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      }</Text>
      {registro.observacao && <Text style={styles.itemObservacao}>Obs: {registro.observacao}</Text>}
      {registro.latitude && registro.longitude && (
        <Text style={styles.itemLocalizacao}>
          Localização: {registro.latitude.toFixed(2)}, {registro.longitude.toFixed(2)}
        </Text>
      )}
    </View>
  );

  // Componente para renderizar cada grupo de data
  const renderGrupo = ({ item }) => (
    <View style={styles.grupoContainer}>
      <View style={styles.grupoHeader}>
        <Text style={styles.grupoData}>{item.data}</Text>
      </View>
      {item.registros.map(registro => (
        <View key={registro.id}>
          {renderRegistro(registro)}
        </View>
      ))}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#00E0FF" />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico de Ponto</Text>
      
      {/* Área de filtros */}
      <View style={styles.filtroContainer}>
        <TouchableOpacity 
          style={styles.filtroButton} 
          onPress={() => setMostrarPicker(true)}
        >
          <Text style={styles.filtroButtonText}>
            {filtroAtivo 
              ? `Filtro: ${dataFiltro.toLocaleDateString('pt-BR')}` 
              : 'Filtrar por Data'}
          </Text>
        </TouchableOpacity>
        
        {filtroAtivo && (
          <TouchableOpacity 
            style={styles.limparFiltroButton} 
            onPress={limparFiltro}
          >
            <Text style={styles.limparFiltroText}>Limpar Filtro</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* DatePicker para iOS */}
      {Platform.OS === 'ios' && mostrarPicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={mostrarPicker}
          onRequestClose={() => setMostrarPicker(false)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <DateTimePicker
                value={dataFiltro}
                mode="date"
                display="spinner"
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonCancel]}
                  onPress={() => setMostrarPicker(false)}
                >
                  <Text style={styles.buttonTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonApply]}
                  onPress={aplicarFiltro}
                >
                  <Text style={styles.buttonTextApply}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      
      {/* DatePicker para Android */}
      {Platform.OS === 'android' && mostrarPicker && (
        <DateTimePicker
          value={dataFiltro}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}
      
      {registrosAgrupados.length === 0 && !loading ? (
        <Text style={styles.noDataText}>
          {filtroAtivo 
            ? `Nenhum registro encontrado para ${dataFiltro.toLocaleDateString('pt-BR')}.`
            : 'Nenhum registro de ponto encontrado.'}
        </Text>
      ) : (
        <FlatList
          data={registrosAgrupados}
          renderItem={renderGrupo}
          keyExtractor={(item) => item.data}
          style={styles.list}
          contentContainerStyle={styles.listContentContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={["#00E0FF"]}
            />
          }
        />
      )}
      
      <View style={styles.backButtonContainer}>
        <Button 
          title="Voltar" 
          onPress={() => router.back()} 
          color="#FF6347" 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: '#121220',
    alignItems: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#00E0FF',
    fontFamily: 'monospace',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00E0FF',
    marginBottom: 15,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  filtroContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '95%',
    marginBottom: 15,
  },
  filtroButton: {
    backgroundColor: '#00E0FF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
  },
  filtroButtonText: {
    color: '#121220',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  limparFiltroButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6347',
  },
  limparFiltroText: {
    color: '#FF6347',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  list: {
    width: '95%',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  grupoContainer: {
    marginBottom: 15,
    backgroundColor: 'rgba(30, 30, 47, 0.7)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  grupoHeader: {
    backgroundColor: '#00E0FF',
    padding: 10,
  },
  grupoData: {
    color: '#121220',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  itemContainer: {
    backgroundColor: '#1E1E2F',
    padding: 15,
    marginVertical: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 224, 255, 0.2)',
  },
  itemTipo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  itemDataHora: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  itemObservacao: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 5,
    fontStyle: 'italic',
    fontFamily: 'monospace',
  },
  itemLocalizacao: {
    fontSize: 12,
    color: '#00E0FF',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  noDataText: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 50,
    fontFamily: 'monospace',
    width: '80%',
  },
  backButtonContainer: {
    width: '90%',
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: '#1E1E2F',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6347',
  },
  buttonApply: {
    backgroundColor: '#00E0FF',
  },
  buttonTextCancel: {
    color: '#FF6347',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  buttonTextApply: {
    color: '#121220',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});