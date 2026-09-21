const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

/** O backend devolve as mensagens de negócio em { mensagens: [...] }. */
export class ErroApi extends Error {
  readonly mensagens: string[];

  constructor(mensagens: string[]) {
    super(mensagens.join(' '));
    this.name = 'ErroApi';
    this.mensagens = mensagens;
  }
}

export async function requisitar<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      ...opcoes,
      headers: { 'Content-Type': 'application/json', ...opcoes.headers },
    });
  } catch {
    throw new ErroApi(['Não foi possível falar com o servidor.']);
  }

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new ErroApi(corpo?.mensagens ?? ['Falha na comunicação com o servidor.']);
  }

  return resposta.status === 204 ? (undefined as T) : ((await resposta.json()) as T);
}
