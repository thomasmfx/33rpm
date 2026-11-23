import styles from './Chatbot.module.scss';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLoja } from '../../contexts/loja';
import { formatarPrecoCurto } from '../../utils/precificacao';
import { avaliarResposta, conversar } from '../../services/assistenteService';
import { ErroApi } from '../../services/api';
import type { SugestaoAssistente, TurnoConversa } from '../../types/assistente';
import { Close, Send, ThumbsDown, ThumbsUp } from '@carbon/icons-react';

const SUGESTOES = [
  'Me recomenda uns discos',
  'Rap psicodélico',
  'Algo parecido com Currents',
  'De que ano é o Illmatic?',
];

/** O mesmo limite do servidor (AssistenteService.TAMANHO_MAXIMO_MENSAGEM). */
const TAMANHO_MAXIMO = 500;

interface Mensagem {
  id: string;
  autor: 'cliente' | 'assistente';
  texto: string;
  /** Só a resposta da IA tem id no servidor, e só ela é avaliada. */
  interacaoId?: number;
  sugestoes?: SugestaoAssistente[];
  isUtil?: boolean | null;
  erro?: boolean;
  erroAvaliacao?: boolean;
}

interface ChatbotProps {
  onFechar?: () => void;
}

function novoId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function saudacao(nome: string): Mensagem {
  const primeiroNome = nome.trim().split(/\s+/)[0];
  return {
    id: 'inicial',
    autor: 'assistente',
    texto:
      `Oi, ${primeiroNome}! Eu ajudo a achar um disco no nosso acervo. Peça uma recomendação, ` +
      'conte um clima ("vinil pra ouvir na chuva") ou tire uma dúvida sobre um disco. Eu levo em ' +
      'conta o que você já comprou e os gêneros que você marcou em Minha conta.',
  };
}

// a conversa sobrevive a fechar o painel e a trocar de página, e some com a aba
const chaveDaConversa = (clienteId: string) => `33rpm:conversa:${clienteId}`;

function lerConversa(clienteId: string, nome: string): Mensagem[] {
  try {
    const salva = sessionStorage.getItem(chaveDaConversa(clienteId));
    if (salva) return JSON.parse(salva) as Mensagem[];
  } catch {
    // sem sessionStorage a conversa só não persiste
  }
  return [saudacao(nome)];
}

/**
 * A resposta anterior volta à IA no mesmo JSON que ela produz, com os discos sugeridos, para
 * "e o segundo?" fazer sentido. Em texto livre, o modelo ajustado imitava o texto e parava de
 * responder em JSON, e o chat perdia os cards.
 */
function paraTurno(mensagem: Mensagem): TurnoConversa {
  if (mensagem.autor === 'cliente') {
    return { autor: 'cliente', texto: mensagem.texto };
  }
  const sugestoes = (mensagem.sugestoes ?? []).map((sugestao) => ({
    discoId: sugestao.disco.id,
    motivo: sugestao.motivo,
  }));
  return { autor: 'assistente', texto: JSON.stringify({ texto: mensagem.texto, sugestoes }) };
}

function Cabecalho({ onFechar }: Readonly<{ onFechar?: () => void }>) {
  return (
    <div className={styles.cabecalho}>
      <div className={styles.titulo}>
        <strong>Assistente 33rpm</strong>
        <span>Recomendações com IA generativa</span>
      </div>
      {onFechar && (
        <button
          type="button"
          className={styles.fechar}
          onClick={onFechar}
          aria-label="Fechar assistente"
        >
          <Close size={20} />
        </button>
      )}
    </div>
  );
}

function CartaoSugestao({ sugestao }: Readonly<{ sugestao: SugestaoAssistente }>) {
  const { disco } = sugestao;
  return (
    <Link to={`/disco/${disco.id}`} className={styles.cartao} data-testid="sugestao-disco">
      <img src={disco.coverThumb ?? disco.coverSrc} alt="" />
      <span className={styles.cartaoTexto}>
        <strong>{disco.title}</strong>
        <span>{disco.artist}</span>
        <span className={styles.motivo}>
          {sugestao.tipo === 'descoberta' && (
            <span className={styles.descoberta} data-testid="tag-descoberta">
              Descoberta
            </span>
          )}
          {sugestao.motivo}
        </span>
      </span>
      <span className={styles.preco}>{formatarPrecoCurto(disco.price)}</span>
    </Link>
  );
}

function Avaliacao({
  mensagem,
  onAvaliar,
}: Readonly<{ mensagem: Mensagem; onAvaliar: (util: boolean) => void }>) {
  let rotulo: ReactNode = 'Esta resposta ajudou?';
  if (mensagem.erroAvaliacao) rotulo = 'Não foi possível registrar a avaliação.';
  else if (mensagem.isUtil != null) {
    rotulo = <span data-testid="avaliacao-registrada">Obrigado! Avaliação registrada.</span>;
  }

  return (
    <div className={styles.avaliacao}>
      <span>{rotulo}</span>
      <button
        type="button"
        className={styles.botaoAvaliacao}
        aria-pressed={mensagem.isUtil === true}
        onClick={() => onAvaliar(true)}
        data-testid="avaliar-util"
      >
        <ThumbsUp size={16} /> Útil
      </button>
      <button
        type="button"
        className={styles.botaoAvaliacao}
        aria-pressed={mensagem.isUtil === false}
        onClick={() => onAvaliar(false)}
        data-testid="avaliar-nao-util"
      >
        <ThumbsDown size={16} /> Não útil
      </button>
    </div>
  );
}

/** RNF0044: o chat é do cliente; sem sessão de cliente, ele só convida a entrar. */
export default function Chatbot({ onFechar }: Readonly<ChatbotProps>) {
  const { clienteAtivo } = useLoja();
  const { pathname } = useLocation();

  if (!clienteAtivo) {
    return (
      <div className={styles.container}>
        <Cabecalho onFechar={onFechar} />
        <div className={styles.chat}>
          <div className={styles.respostaAssistente} data-testid="chat-sem-sessao">
            <p>
              Eu recomendo discos a partir das suas compras e dos gêneros que você prefere. Entre
              na sua conta de cliente para conversar comigo.
            </p>
            <Link to="/login" state={{ depois: pathname }} className={styles.entrar}>
              Entrar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Conversa
      key={clienteAtivo.id}
      clienteId={clienteAtivo.id}
      nome={clienteAtivo.nome}
      onFechar={onFechar}
    />
  );
}

interface ConversaProps {
  clienteId: string;
  nome: string;
  onFechar?: () => void;
}

function Conversa({ clienteId, nome, onFechar }: Readonly<ConversaProps>) {
  const [mensagens, setMensagens] = useState<Mensagem[]>(() => lerConversa(clienteId, nome));
  const [mensagemAtual, setMensagemAtual] = useState('');
  const [aguardandoResposta, setAguardandoResposta] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // rola antes da pintura; com useEffect a mensagem nova aparece um quadro fora da tela
  useLayoutEffect(() => {
    const chat = chatRef.current;
    if (chat) chat.scrollTop = chat.scrollHeight;
  }, [mensagens, aguardandoResposta]);

  useEffect(() => {
    try {
      sessionStorage.setItem(chaveDaConversa(clienteId), JSON.stringify(mensagens));
    } catch {
      // sem sessionStorage a conversa só não persiste
    }
  }, [clienteId, mensagens]);

  async function enviar(bruto: string): Promise<void> {
    const texto = bruto.trim();
    if (!texto || aguardandoResposta) return;

    const historico = mensagens
      .filter((mensagem) => mensagem.id !== 'inicial' && !mensagem.erro)
      .map(paraTurno);
    setMensagens((atuais) => [...atuais, { id: novoId(), autor: 'cliente', texto }]);
    setMensagemAtual('');
    setAguardandoResposta(true);

    try {
      const interacao = await conversar(clienteId, texto, historico);
      setMensagens((atuais) => [
        ...atuais,
        {
          id: novoId(),
          autor: 'assistente',
          texto: interacao.resposta,
          interacaoId: interacao.id,
          sugestoes: interacao.sugestoes,
          isUtil: interacao.isUtil,
        },
      ]);
    } catch (erro) {
      setMensagens((atuais) => [
        ...atuais,
        {
          id: novoId(),
          autor: 'assistente',
          texto:
            erro instanceof ErroApi
              ? erro.mensagens.join(' ')
              : 'Não consegui responder agora. Tente de novo em instantes.',
          erro: true,
        },
      ]);
    } finally {
      setAguardandoResposta(false);
    }
  }

  async function avaliar(mensagem: Mensagem, util: boolean): Promise<void> {
    if (!mensagem.interacaoId) return;
    const anterior = mensagem.isUtil ?? null;
    const marcar = (isUtil: boolean | null, erroAvaliacao: boolean) =>
      setMensagens((atuais) =>
        atuais.map((atual) =>
          atual.id === mensagem.id ? { ...atual, isUtil, erroAvaliacao } : atual,
        ),
      );

    marcar(util, false);
    try {
      await avaliarResposta(mensagem.interacaoId, util);
    } catch {
      marcar(anterior, true);
    }
  }

  function handleEnviarMensagem(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    void enviar(mensagemAtual);
  }

  const soSaudacao = mensagens.length === 1;

  return (
    <div className={styles.container}>
      <Cabecalho onFechar={onFechar} />

      <div className={styles.chat} ref={chatRef}>
        {mensagens.map((mensagem) =>
          mensagem.autor === 'cliente' ? (
            <p key={mensagem.id} className={styles.balaoCliente}>
              {mensagem.texto}
            </p>
          ) : (
            <div
              key={mensagem.id}
              className={styles.respostaAssistente}
              data-erro={mensagem.erro || undefined}
              data-testid={mensagem.interacaoId ? 'resposta-assistente' : undefined}
            >
              <p>{mensagem.texto}</p>
              {mensagem.sugestoes?.map((sugestao) => (
                <CartaoSugestao key={sugestao.id} sugestao={sugestao} />
              ))}
              {mensagem.interacaoId && (
                <Avaliacao mensagem={mensagem} onAvaliar={(util) => void avaliar(mensagem, util)} />
              )}
            </div>
          ),
        )}

        {soSaudacao && (
          <div className={styles.sugestoes}>
            {SUGESTOES.map((sugestao) => (
              <button
                key={sugestao}
                type="button"
                className={styles.sugestao}
                onClick={() => void enviar(sugestao)}
              >
                {sugestao}
              </button>
            ))}
          </div>
        )}

        {aguardandoResposta && (
          <div className={styles.procurando}>
            <img src="/images/vinil.svg" alt="" />
            Procurando no acervo…
          </div>
        )}
      </div>

      <form className={styles.formulario} onSubmit={handleEnviarMensagem}>
        <input
          className={styles.campoMensagem}
          placeholder="Me conte o que você quer ouvir…"
          value={mensagemAtual}
          maxLength={TAMANHO_MAXIMO}
          onChange={(evento) => setMensagemAtual(evento.currentTarget.value)}
          autoComplete="off"
          aria-label="Mensagem para o assistente"
          data-testid="chat-mensagem"
        />
        <button
          type="submit"
          className={styles.enviar}
          disabled={aguardandoResposta || !mensagemAtual.trim()}
          data-testid="chat-enviar"
        >
          Enviar <Send size={16} />
        </button>
      </form>
    </div>
  );
}
