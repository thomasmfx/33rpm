import styles from './Chatbot.module.scss';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ActionIcon, Group, Image, Loader, Stack, Text, TextInput } from '@mantine/core';
import { IconSend, IconX } from '@tabler/icons-react';
import { useLoja } from '../../contexts/loja';
import { interpretar, recomendar } from '../../utils/recomendacao';
import type { Intencao, Recomendacao } from '../../utils/recomendacao';
import { formatarBRL } from '../../utils/precificacao';
import { difyConfigurado, perguntarAoDify } from '../../utils/dify';

const LIMITE_RECOMENDACOES = 3;

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
      id: crypto.randomUUID().slice(0, 8),
      autor: 'assistente',
      texto: textoResposta(recomendacoes, intencao),
      discos: recomendacoes.length > 0 ? recomendacoes : undefined,
    };
  }

  async function handleEnviarMensagem(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();

    const texto = mensagemAtual.trim();
    if (!texto) return;

    const mensagemCliente: Mensagem = {
      id: crypto.randomUUID().slice(0, 8),
      autor: 'cliente',
      texto,
    };
    setMensagens((atuais) => [...atuais, mensagemCliente]);
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
          id: crypto.randomUUID().slice(0, 8),
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

  return (
    <div className={styles.container}>
      {onFechar && (
        <div className={styles.cabecalho}>
          <Text size="sm" fw={700}>Assistente de recomendação</Text>
          <ActionIcon variant="subtle" color="gray" onClick={onFechar}>
            <IconX size={18} />
          </ActionIcon>
        </div>
      )}

      <div className={styles.chat}>
        {mensagens.map((mensagem) => (
          <div
            key={mensagem.id}
            className={mensagem.autor === 'cliente' ? styles.linhaCliente : styles.linhaAssistente}
          >
            <div
              className={
                mensagem.autor === 'cliente' ? styles.balaoCliente : styles.balaoAssistente
              }
            >
              <Text size="sm">{mensagem.texto}</Text>

              {mensagem.discos && (
                <div className={styles.cartoes}>
                  {mensagem.discos.map((recomendacao) => (
                    <Link
                      key={recomendacao.disco.id}
                      to={`/disco/${recomendacao.disco.id}`}
                      className={styles.cartao}
                    >
                      <Image
                        src={recomendacao.disco.coverSrc}
                        alt={recomendacao.disco.title}
                        w={56}
                        h={56}
                        radius="sm"
                        fit="cover"
                      />
                      <Stack gap={2} flex={1}>
                        <Text size="sm" fw={700} lineClamp={1}>
                          {recomendacao.disco.title}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {recomendacao.disco.artist}
                        </Text>
                        <Text size="xs" fw={600}>
                          {formatarBRL(recomendacao.disco.price)}
                        </Text>
                        <Text size="xs" c="dimmed" fs="italic">
                          {recomendacao.motivo}
                        </Text>
                      </Stack>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {aguardandoResposta && (
          <div className={styles.linhaAssistente}>
            <div className={styles.balaoAssistente}>
              <Loader size="xs" />
            </div>
          </div>
        )}
      </div>

      <form className={styles.formulario} onSubmit={handleEnviarMensagem}>
        <Group gap="xs" align="flex-end">
          <TextInput
            className={styles.campoMensagem}
            placeholder="Me conte o que você quer ouvir..."
            radius="sm"
            size="md"
            value={mensagemAtual}
            onChange={(evento) => setMensagemAtual(evento.currentTarget.value)}
          />
          <ActionIcon type="submit" size={42} radius="sm" variant="filled" color="black">
            <IconSend size={20} />
          </ActionIcon>
        </Group>
      </form>

      <Text size="xs" c="dimmed" className={styles.rodape}>
        {difyConfigurado()
          ? 'Esta conversa passa pelo Dify.ai para gerar as respostas e sugestões.'
          : 'As recomendações são geradas localmente, a partir do acervo e do seu histórico de ' +
            'compras — não há um modelo de IA rodando por trás. A integração com IA generativa ' +
            'entra quando o projeto tiver um backend.'}
      </Text>
    </div>
  );
}
