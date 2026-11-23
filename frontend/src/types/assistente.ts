import type { Disco } from './disco';

/** Afinidade: no gosto de costume do cliente. Descoberta: fora dele. */
export type TipoSugestao = 'afinidade' | 'descoberta';

export interface SugestaoAssistente {
  id: number;
  disco: Disco;
  motivo: string;
  tipo: TipoSugestao;
}

/** RNF0044: uma pergunta ao assistente, a resposta da IA e a avaliação do cliente. */
export interface InteracaoAssistente {
  id: number;
  clienteId: number;
  /** Só na listagem da curadoria. */
  clienteNome?: string;
  pergunta: string;
  resposta: string;
  modelo: string;
  /** null enquanto o cliente não avaliou. */
  isUtil: boolean | null;
  dataCadastro: string;
  dataAvaliacao?: string;
  sugestoes: SugestaoAssistente[];
}

export interface TurnoConversa {
  autor: 'cliente' | 'assistente';
  texto: string;
}

export type FiltroAvaliacao = 'util' | 'nao-util' | 'pendente';

export type StatusTreinamento = 'EM TREINAMENTO' | 'CONCLUIDO' | 'FALHOU';

/** RNF0044 item 3: um ajuste fino do modelo com as vendas e o feedback. */
export interface Treinamento {
  id: number;
  dataCadastro: string;
  status: StatusTreinamento;
  modeloBase: string;
  job?: string;
  modeloAjustado?: string;
  datasetUri?: string;
  exemplosVendas: number;
  exemplosFeedback: number;
  exemplosAcervo: number;
  feedbacksDescartados: number;
  erro?: string;
  dataConclusao?: string;
}

export interface SituacaoAssistente {
  descricao: string;
  modeloBase: string;
  /** O ajuste fino que responde no chat; ausente enquanto responde o modelo base. */
  treinoEmUso?: Treinamento;
  treinoEmAndamento: boolean;
  exemplosVendas: number;
  exemplosFeedback: number;
  /** Dúvidas, buscas e perguntas fora do tema respondidas com o acervo, uma por venda. */
  exemplosAcervo: number;
  feedbacksDescartados: number;
  /** Exemplos que entraram desde o último treino. */
  exemplosNovos: number;
  minimoExemplos: number;
}
