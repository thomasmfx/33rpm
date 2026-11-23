import painel from '../../pages/Curadoria/Painel.module.scss';
import styles from './CuradoriaAssistente.module.scss';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Progress, SegmentedControl, Skeleton } from '@mantine/core';
import {
  acompanharTreinamentos,
  buscarSituacao,
  iniciarTreinamento,
  listarInteracoes,
  listarTreinamentos,
  urlDoDataset,
} from '../../services/assistenteService';
import { ErroApi } from '../../services/api';
import type {
  FiltroAvaliacao,
  InteracaoAssistente,
  SituacaoAssistente,
  StatusTreinamento,
  Treinamento,
} from '../../types/assistente';
import CabecalhoPainel from '../CabecalhoPainel/CabecalhoPainel';
import StatusPonto from '../StatusPonto/StatusPonto';
import { DocumentDownload, MachineLearningModel, Renew } from '@carbon/icons-react';

const COLUNAS_TREINOS = '56px 140px 160px minmax(0, 1fr) 140px';
const COLUNAS_FEEDBACK = '120px 160px minmax(0, 2fr) minmax(0, 1fr) 100px';
/** Com um treino no Vertex AI em andamento, o painel confere o status sozinho. */
const INTERVALO_ACOMPANHAMENTO_MS = 30_000;

const COR_STATUS: Record<StatusTreinamento, string> = {
  'EM TREINAMENTO': '#D9501F',
  CONCLUIDO: '#2F7A4E',
  FALHOU: '#B83A2A',
};

const ROTULO_STATUS: Record<StatusTreinamento, string> = {
  'EM TREINAMENTO': 'Em treinamento',
  CONCLUIDO: 'Concluído',
  FALHOU: 'Falhou',
};

function dataHora(iso?: string): string {
  return iso
    ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
}

function hora(instante: string | number): string {
  return new Date(instante).toLocaleTimeString('pt-BR');
}

/** O tempo de envio conta até a última consulta, não até o render, para o texto não oscilar. */
function tempoDesde(iso: string, ultimaConsulta: number): string {
  const minutos = Math.max(0, Math.floor((ultimaConsulta - new Date(iso).getTime()) / 60_000));
  return minutos < 1 ? 'há menos de um minuto' : `há ${minutos} min`;
}

/**
 * RNF0044: o assistente visto pela curadoria. Mostra a IA em uso, os dados que o próximo
 * ajuste fino vai usar, o histórico de treinos e o feedback que os clientes deram no chat.
 */
export default function CuradoriaAssistente() {
  const [situacao, setSituacao] = useState<SituacaoAssistente | null>(null);
  const [treinos, setTreinos] = useState<Treinamento[]>([]);
  const [interacoes, setInteracoes] = useState<InteracaoAssistente[] | null>(null);
  const [filtro, setFiltro] = useState<FiltroAvaliacao | 'todas'>('todas');
  const [erros, setErros] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [treinando, setTreinando] = useState(false);
  const [ultimaConsulta, setUltimaConsulta] = useState(0);
  // os treinos que estavam em andamento na consulta anterior: quando um deles termina, o
  // painel avisa, mesmo que a curadoria só tenha deixado a página aberta
  const emAndamentoAntes = useRef<Set<number>>(new Set());

  const carregar = useCallback(async () => {
    try {
      const [novaSituacao, novosTreinos] = await Promise.all([buscarSituacao(), listarTreinamentos()]);
      const terminados = novosTreinos.filter(
        (treino) => emAndamentoAntes.current.has(treino.id) && treino.status !== 'EM TREINAMENTO',
      );
      emAndamentoAntes.current = new Set(
        novosTreinos.filter((treino) => treino.status === 'EM TREINAMENTO').map((treino) => treino.id),
      );
      setSituacao(novaSituacao);
      setTreinos(novosTreinos);
      setUltimaConsulta(Date.now());
      for (const treino of terminados) {
        if (treino.status === 'CONCLUIDO') {
          setAviso(`Treino ${treino.id} concluído. O chat já responde com o modelo ajustado.`);
        } else {
          setErros([`Treino ${treino.id} falhou: ${treino.erro ?? 'o Vertex AI não informou o motivo.'}`]);
        }
      }
    } catch (erro) {
      setErros(erro instanceof ErroApi ? erro.mensagens : ['Falha ao carregar o assistente.']);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  useEffect(() => {
    let cancelado = false;
    listarInteracoes(filtro === 'todas' ? undefined : filtro)
      .then((lista) => {
        if (!cancelado) setInteracoes(lista);
      })
      .catch((erro) => {
        if (!cancelado) {
          setErros(erro instanceof ErroApi ? erro.mensagens : ['Falha ao carregar o feedback.']);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [filtro]);

  const acompanhar = useCallback(async () => {
    try {
      await acompanharTreinamentos();
      await carregar();
    } catch (erro) {
      setErros(erro instanceof ErroApi ? erro.mensagens : ['Falha ao consultar os treinos.']);
    }
  }, [carregar]);

  const emAndamento = situacao?.treinoEmAndamento ?? false;
  useEffect(() => {
    if (!emAndamento) return;
    const intervalo = setInterval(() => void acompanhar(), INTERVALO_ACOMPANHAMENTO_MS);
    return () => clearInterval(intervalo);
  }, [emAndamento, acompanhar]);

  async function treinar(): Promise<void> {
    setTreinando(true);
    setErros([]);
    setAviso(null);
    try {
      const treino = await iniciarTreinamento();
      setAviso(
        treino.status === 'FALHOU'
          ? null
          : `Treino ${treino.id} enviado com ${treino.exemplosVendas + treino.exemplosAcervo + treino.exemplosFeedback} exemplos.`,
      );
      await carregar();
    } catch (erro) {
      setErros(erro instanceof ErroApi ? erro.mensagens : ['Não foi possível iniciar o treino.']);
    } finally {
      setTreinando(false);
    }
  }

  const emUso = situacao?.treinoEmUso;
  const treinoEmAndamento = treinos.find((treino) => treino.status === 'EM TREINAMENTO');

  return (
    <div className={painel.painel}>
      <CabecalhoPainel
        titulo="Assistente"
        resumo="IA generativa, ajuste fino e feedback do chat"
        acoes={
          <>
            <Button
              component="a"
              href={urlDoDataset()}
              variant="outline"
              leftSection={<DocumentDownload size={16} />}
              data-testid="btn-dataset-atual"
            >
              Dataset atual
            </Button>
            <Button
              variant="outline"
              leftSection={<Renew size={16} />}
              onClick={() => void acompanhar()}
              data-testid="btn-atualizar-treinos"
            >
              Atualizar
            </Button>
            <Button
              leftSection={<MachineLearningModel size={16} />}
              loading={treinando}
              disabled={emAndamento}
              onClick={() => void treinar()}
              data-testid="btn-treinar"
            >
              Treinar agora
            </Button>
          </>
        }
      />

      {erros.length > 0 && (
        <Alert color="red" withCloseButton onClose={() => setErros([])} data-testid="erro-assistente">
          {erros.join(' ')}
        </Alert>
      )}
      {aviso && (
        <Alert color="green" withCloseButton onClose={() => setAviso(null)} data-testid="aviso-treino">
          {aviso}
        </Alert>
      )}

      {treinoEmAndamento && (
        <section className={styles.andamento} data-testid="treino-em-andamento">
          <div className={styles.andamentoTopo}>
            <strong>Treino {treinoEmAndamento.id} em andamento</strong>
            <span>enviado {tempoDesde(treinoEmAndamento.dataCadastro, ultimaConsulta)}</span>
          </div>
          <Progress value={100} striped animated color="orange" aria-label="Treino em andamento" />
          <span className={styles.nota}>
            O Google costuma levar de 15 a 45 minutos. O painel confere o status a cada 30
            segundos (última consulta às {hora(ultimaConsulta)}) e avisa quando terminar; até lá,
            o chat segue com o modelo atual.
          </span>
        </section>
      )}

      {situacao === null ? (
        <Skeleton h={160} />
      ) : (
        <div className={styles.blocos}>
          <section className={styles.bloco} data-testid="modelo-em-uso">
            <span className={styles.rotuloBloco}>Modelo em uso no chat</span>
            <strong className={styles.destaque}>{situacao.descricao}</strong>
            {emUso ? (
              <>
                <span>
                  Ajustado no treino {emUso.id}, concluído em {dataHora(emUso.dataConclusao)}, com{' '}
                  {emUso.exemplosVendas} exemplos de vendas, {emUso.exemplosAcervo} do acervo e{' '}
                  {emUso.exemplosFeedback} de feedback.
                </span>
                <span className={painel.codigo}>{emUso.modeloAjustado}</span>
              </>
            ) : (
              <span>Modelo base, ainda sem ajuste fino concluído.</span>
            )}
          </section>

          <section className={styles.bloco} data-testid="proximo-treino">
            <span className={styles.rotuloBloco}>Dados do próximo treino</span>
            <dl className={styles.numeros}>
              <div>
                <dt>Exemplos de vendas</dt>
                <dd data-testid="exemplos-vendas" data-valor={situacao.exemplosVendas}>
                  {situacao.exemplosVendas}
                </dd>
              </div>
              <div>
                <dt>Do acervo</dt>
                <dd data-testid="exemplos-acervo" data-valor={situacao.exemplosAcervo}>
                  {situacao.exemplosAcervo}
                </dd>
              </div>
              <div>
                <dt>Feedback útil</dt>
                <dd data-testid="exemplos-feedback" data-valor={situacao.exemplosFeedback}>
                  {situacao.exemplosFeedback}
                </dd>
              </div>
              <div>
                <dt>Não útil, descartado</dt>
                <dd data-testid="feedbacks-descartados" data-valor={situacao.feedbacksDescartados}>
                  {situacao.feedbacksDescartados}
                </dd>
              </div>
              <div>
                <dt>Novos desde o último treino</dt>
                <dd data-testid="exemplos-novos" data-valor={situacao.exemplosNovos}>
                  {situacao.exemplosNovos}
                </dd>
              </div>
            </dl>
            <span className={styles.nota}>
              Os exemplos novos só entram no modelo quando a curadoria treinar de novo.
            </span>
          </section>
        </div>
      )}

      <section className={styles.explicacao}>
        <span className={styles.rotuloBloco}>Como o ajuste fino é feito</span>
        <ol>
          <li>
            Cada compra a partir da segunda vira um exemplo: o perfil do cliente com as compras
            anteriores pede uma recomendação, e a resposta esperada são até três discos que ele
            levou nas compras seguintes.
          </li>
          <li>
            Junto com cada venda vai um exemplo de outra tarefa do chat, com o mesmo perfil e o
            mesmo acervo: dúvida sobre um disco, busca por título, artista, estilo ou preço, ou
            pergunta fora do tema, respondida com os dados do acervo. Assim o modelo aprende a
            recomendar sem esquecer o resto.
          </li>
          <li>
            Cada resposta do chat avaliada como útil vira um exemplo com a mesma pergunta e o mesmo
            perfil. As avaliadas como não úteis ficam fora, para o treino não reforçar o erro.
          </li>
          <li>
            O dataset vai ao Vertex AI, que faz o ajuste fino supervisionado do Gemini a partir do
            modelo base. Concluído o treino, o chat passa a responder com o modelo ajustado.
          </li>
          <li>
            Vendas e avaliações novas entram no próximo treino, que a curadoria dispara pelo
            botão Treinar agora.
          </li>
        </ol>
      </section>

      <section className={styles.secao}>
        <h2 className={styles.tituloSecao}>Treinos</h2>
        <div className={painel.tabela} data-testid="tabela-treinos">
          <div className={painel.cabecalhoTabela} style={{ gridTemplateColumns: COLUNAS_TREINOS }}>
            <span>#</span>
            <span>Início</span>
            <span>Status</span>
            <span>Exemplos e modelo</span>
            <span className={painel.direita}>Dataset</span>
          </div>
          {treinos.length === 0 && <div className={painel.vazio}>Nenhum treino feito ainda.</div>}
          {treinos.map((treino) => (
            <div
              key={treino.id}
              className={painel.linhaTabela}
              style={{ gridTemplateColumns: COLUNAS_TREINOS }}
              data-testid="linha-treino"
              data-status={treino.status}
            >
              <span className={painel.codigo}>{treino.id}</span>
              <span>{dataHora(treino.dataCadastro)}</span>
              <StatusPonto cor={COR_STATUS[treino.status]}>{ROTULO_STATUS[treino.status]}</StatusPonto>
              <span className={styles.celulaTreino}>
                <span>
                  {treino.exemplosVendas} de vendas · {treino.exemplosAcervo} do acervo ·{' '}
                  {treino.exemplosFeedback} de feedback · {treino.feedbacksDescartados} descartados
                </span>
                {treino.erro && <span className={styles.erro}>{treino.erro}</span>}
                {treino.modeloAjustado && (
                  <span className={painel.sub}>{treino.modeloAjustado}</span>
                )}
              </span>
              <a className={`${painel.acao} ${painel.direita}`} href={urlDoDataset(treino.id)}>
                Baixar JSONL
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.secao}>
        <div className={styles.cabecalhoSecao}>
          <h2 className={styles.tituloSecao}>Feedback do chat</h2>
          <SegmentedControl
            data-testid="filtro-avaliacao"
            value={filtro}
            onChange={(valor) => setFiltro(valor as FiltroAvaliacao | 'todas')}
            data={[
              { label: 'Todas', value: 'todas' },
              { label: 'Úteis', value: 'util' },
              { label: 'Não úteis', value: 'nao-util' },
              { label: 'Sem avaliação', value: 'pendente' },
            ]}
          />
        </div>
        <div className={painel.tabela} data-testid="tabela-feedback">
          <div className={painel.cabecalhoTabela} style={{ gridTemplateColumns: COLUNAS_FEEDBACK }}>
            <span>Data</span>
            <span>Cliente</span>
            <span>Pergunta e resposta</span>
            <span>Sugestões</span>
            <span>Avaliação</span>
          </div>
          {interacoes === null && <Skeleton h={64} />}
          {interacoes?.length === 0 && (
            <div className={painel.vazio}>Nenhuma resposta com esta avaliação.</div>
          )}
          {interacoes?.map((interacao) => (
            <div
              key={interacao.id}
              className={painel.linhaTabela}
              style={{ gridTemplateColumns: COLUNAS_FEEDBACK }}
              data-testid="linha-feedback"
              data-interacao={interacao.id}
            >
              <span className={painel.sub}>{dataHora(interacao.dataCadastro)}</span>
              <span>{interacao.clienteNome}</span>
              <span className={styles.celulaConversa}>
                <strong>{interacao.pergunta}</strong>
                <span className={painel.sub}>{interacao.resposta}</span>
              </span>
              <span className={painel.sub}>
                {interacao.sugestoes.map((sugestao) => sugestao.disco.title).join(', ') || '—'}
              </span>
              <span data-testid="avaliacao" data-util={String(interacao.isUtil)}>
                {interacao.isUtil === null && '—'}
                {interacao.isUtil === true && <StatusPonto cor="#2F7A4E">Útil</StatusPonto>}
                {interacao.isUtil === false && <StatusPonto cor="#B83A2A">Não útil</StatusPonto>}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
