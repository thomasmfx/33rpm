import type {
  FiltroAvaliacao,
  InteracaoAssistente,
  SituacaoAssistente,
  Treinamento,
  TurnoConversa,
} from '../types/assistente';
import { requisitar, urlDaApi } from './api';
import { paraDisco, type DiscoApi } from './discosService';

type InteracaoApi = Omit<InteracaoAssistente, 'sugestoes'> & {
  sugestoes: (Omit<InteracaoAssistente['sugestoes'][number], 'disco'> & { disco: DiscoApi })[];
};

function paraInteracao(bruto: InteracaoApi): InteracaoAssistente {
  return {
    ...bruto,
    isUtil: bruto.isUtil ?? null,
    sugestoes: bruto.sugestoes.map((sugestao) => ({ ...sugestao, disco: paraDisco(sugestao.disco) })),
  };
}

/** RNF0044: a pergunta vai com as trocas anteriores, para a IA seguir a conversa. */
export async function conversar(
  clienteId: string,
  mensagem: string,
  historico: TurnoConversa[],
): Promise<InteracaoAssistente> {
  const bruto = await requisitar<InteracaoApi>('/assistente/mensagens', {
    method: 'POST',
    body: JSON.stringify({ clienteId: Number(clienteId), mensagem, historico }),
  });
  return paraInteracao(bruto);
}

/** RNF0044 item 3: útil ou não útil. */
export async function avaliarResposta(id: number, util: boolean): Promise<InteracaoAssistente> {
  const bruto = await requisitar<InteracaoApi>(`/assistente/interacoes/${id}/avaliacao`, {
    method: 'PUT',
    body: JSON.stringify({ isUtil: util }),
  });
  return paraInteracao(bruto);
}

export async function listarInteracoes(avaliacao?: FiltroAvaliacao): Promise<InteracaoAssistente[]> {
  const consulta = avaliacao ? `?avaliacao=${avaliacao}` : '';
  const brutos = await requisitar<InteracaoApi[]>(`/assistente/interacoes${consulta}`);
  return brutos.map(paraInteracao);
}

export function buscarSituacao(): Promise<SituacaoAssistente> {
  return requisitar<SituacaoAssistente>('/assistente/situacao');
}

export function listarTreinamentos(): Promise<Treinamento[]> {
  return requisitar<Treinamento[]>('/assistente/treinamentos');
}

export function iniciarTreinamento(): Promise<Treinamento> {
  return requisitar<Treinamento>('/assistente/treinamentos', { method: 'POST' });
}

/** Consulta agora os treinos em andamento, sem esperar a rotina do servidor. */
export function acompanharTreinamentos(): Promise<Treinamento[]> {
  return requisitar<Treinamento[]>('/assistente/treinamentos/acompanhamento', { method: 'POST' });
}

/** Sem id, o dataset que o próximo treino enviaria. */
export function urlDoDataset(treinoId?: number): string {
  return urlDaApi(treinoId ? `/assistente/treinamentos/${treinoId}/dataset` : '/assistente/dataset');
}
