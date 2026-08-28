import type { Disco } from '../types/disco';

/**
 * Integração com o Dify.ai (que por sua vez fala com o Google AI Studio).
 *
 * As credenciais vêm de VITE_DIFY_API_URL e VITE_DIFY_API_KEY. Sem elas, o
 * chatbot cai no recomendador local de utils/recomendacao — é o que acontece
 * hoje, já que o projeto não tem backend.
 *
 * Chamar o Dify direto do browser expõe a chave no bundle. Serve para
 * demonstrar a integração, mas em produção essa chamada tem que sair de um
 * backend nosso, com a chave no servidor.
 */
const URL_DIFY = import.meta.env.VITE_DIFY_API_URL as string | undefined;
const CHAVE_DIFY = import.meta.env.VITE_DIFY_API_KEY as string | undefined;

export function difyConfigurado(): boolean {
  return Boolean(URL_DIFY && CHAVE_DIFY);
}

export interface RespostaDify {
  texto: string;
  discoIds: number[];
}

/**
 * Manda a pergunta e o acervo resumido, e espera de volta um JSON com a
 * resposta e os ids sugeridos. O prompt do lado do Dify é que garante o formato.
 */
export async function perguntarAoDify(
  mensagem: string,
  discos: Disco[],
  conversaId: string | null,
): Promise<RespostaDify> {
  if (!URL_DIFY || !CHAVE_DIFY) {
    throw new Error('Dify não configurado');
  }

  const acervo = discos
    .filter((disco) => disco.isAtivo && disco.estoque > 0)
    .map((disco) => ({
      id: disco.id,
      titulo: disco.title,
      artista: disco.artist,
      generos: disco.genres,
      estilos: disco.styles,
      preco: disco.price,
    }));

  const resposta = await fetch(`${URL_DIFY}/chat-messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CHAVE_DIFY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: { acervo: JSON.stringify(acervo) },
      query: mensagem,
      response_mode: 'blocking',
      user: '33rpm-web',
      conversation_id: conversaId ?? '',
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Dify respondeu ${resposta.status}`);
  }

  const corpo = (await resposta.json()) as { answer?: string };
  return interpretarResposta(corpo.answer ?? '');
}

export function interpretarResposta(bruto: string): RespostaDify {
  try {
    const json = JSON.parse(bruto) as { texto?: string; discoIds?: number[] };
    return {
      texto: json.texto ?? bruto,
      discoIds: Array.isArray(json.discoIds) ? json.discoIds : [],
    };
  } catch {
    // resposta em texto puro: ainda serve como mensagem, sem cards
    return { texto: bruto, discoIds: [] };
  }
}
