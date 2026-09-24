import styles from './Chatbot.module.scss';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLoja } from '../../contexts/loja';
import { interpretar, recomendar } from '../../utils/recomendacao';
import type { Intencao, Recomendacao } from '../../utils/recomendacao';
import { formatarPrecoCurto } from '../../utils/precificacao';
import { difyConfigurado, perguntarAoDify } from '../../utils/dify';
import { Close, Send } from '@carbon/icons-react';

const LIMITE_RECOMENDACOES = 3;

const SUGESTOES = [
  'Rap psicodélico',
  'Jazz para dias de chuva',
  'Algo parecido com Currents',
  'Clássicos brasileiros',
];

interface Mensagem {
  id: string;
  autor: 'cliente' | 'assistente';
  texto: string;
  discos?: Recomendacao[];
}

interface ChatbotProps {
  onFechar?: () => void;
}

function textoResposta(recomendacoes: Recomendacao[], intencao: Intencao): string {
  if (recomendacoes.length === 0) {
    return 'Não encontrei nada no acervo com esses critérios. Quer tentar outra busca, talvez com um clima ou uma faixa de preço diferente?';
  }
  if (intencao.artista) return `Separei discos ligados a ${intencao.artista}:`;
  if (intencao.categorias.length > 0) {
    return `Encontrei estes discos de ${intencao.categorias.join(', ')}:`;
  }
  return 'Separei algumas sugestões do nosso acervo:';
}

function mensagemInicial(temClienteAtivo: boolean): Mensagem {
  const semHistorico = temClienteAtivo
    ? ''
    : ' Como não há um cliente selecionado no momento, vou sugerir só pelo que você me contar aqui, sem olhar histórico de compras.';

  return {
    id: 'inicial',
    autor: 'assistente',
    texto:
      'Oi! Eu ajudo a achar um disco no nosso acervo. Pode me contar um clima ' +
      '("vinil pra ouvir na chuva"), uma referência ("algo parecido com Tame Impala") ' +
      `ou um pedido direto ("hip hop até R$ 300").${semHistorico}`,
  };
}

function novoId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export default function Chatbot({ onFechar }: Readonly<ChatbotProps>) {
  const { discos, pedidos, clienteAtivo } = useLoja();
  const [mensagens, setMensagens] = useState<Mensagem[]>(() => [
    mensagemInicial(Boolean(clienteAtivo)),
  ]);
  const [mensagemAtual, setMensagemAtual] = useState<string>('');
  const [aguardandoResposta, setAguardandoResposta] = useState(false);

  function recomendarLocalmente(texto: string): Mensagem {
    const intencao = interpretar(texto);
    const recomendacoes = recomendar(
      discos,
      pedidos,
      clienteAtivo?.id ?? null,
      intencao,
      LIMITE_RECOMENDACOES,
    );

    return {
      id: novoId(),
      autor: 'assistente',
      texto: textoResposta(recomendacoes, intencao),
      discos: recomendacoes.length > 0 ? recomendacoes : undefined,
    };
  }

  async function enviar(bruto: string): Promise<void> {
    const texto = bruto.trim();
    if (!texto) return;

    setMensagens((atuais) => [...atuais, { id: novoId(), autor: 'cliente', texto }]);
    setMensagemAtual('');

    if (!difyConfigurado()) {
      setMensagens((atuais) => [...atuais, recomendarLocalmente(texto)]);
      return;
    }

    setAguardandoResposta(true);
    try {
      const resposta = await perguntarAoDify(texto, discos, null);
      const discosSugeridos = resposta.discoIds
        .map((id) => discos.find((disco) => disco.id === id))
        .filter((disco): disco is (typeof discos)[number] => Boolean(disco))
        .map((disco) => ({ disco, motivo: 'Sugestão do assistente' }));

      setMensagens((atuais) => [
        ...atuais,
        {
          id: novoId(),
          autor: 'assistente',
          texto: resposta.texto,
          discos: discosSugeridos.length > 0 ? discosSugeridos : undefined,
        },
      ]);
    } catch {
      setMensagens((atuais) => [...atuais, recomendarLocalmente(texto)]);
    } finally {
      setAguardandoResposta(false);
    }
  }

  function handleEnviarMensagem(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    void enviar(mensagemAtual);
  }

  const soSaudacao = mensagens.length === 1;

  return (
    <div className={styles.container}>
      <div className={styles.cabecalho}>
        <div className={styles.titulo}>
          <strong>Assistente 33rpm</strong>
          <span>{difyConfigurado() ? 'Dify.ai · Gemini' : 'Recomendações do acervo'}</span>
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

      <div className={styles.chat}>
        {mensagens.map((mensagem) =>
          mensagem.autor === 'cliente' ? (
            <p key={mensagem.id} className={styles.balaoCliente}>
              {mensagem.texto}
            </p>
          ) : (
            <div key={mensagem.id} className={styles.respostaAssistente}>
              <p>{mensagem.texto}</p>
              {mensagem.discos?.map((recomendacao) => (
                <Link
                  key={recomendacao.disco.id}
                  to={`/disco/${recomendacao.disco.id}`}
                  className={styles.cartao}
                >
                  <img src={recomendacao.disco.coverThumb ?? recomendacao.disco.coverSrc} alt="" />
                  <span className={styles.cartaoTexto}>
                    <strong>{recomendacao.disco.title}</strong>
                    <span>{recomendacao.disco.artist}</span>
                    <span className={styles.motivo}>{recomendacao.motivo}</span>
                  </span>
                  <span className={styles.preco}>
                    {formatarPrecoCurto(recomendacao.disco.price)}
                  </span>
                </Link>
              ))}
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
          onChange={(evento) => setMensagemAtual(evento.currentTarget.value)}
          autoComplete="off"
          aria-label="Mensagem para o assistente"
        />
        <button type="submit" className={styles.enviar}>
          Enviar <Send size={16} />
        </button>
      </form>
    </div>
  );
}
