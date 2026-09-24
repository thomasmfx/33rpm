import { TIPOS_LOGRADOURO } from '../types/cliente';
import { apenasDigitos } from '../utils/texto';

export interface EnderecoDoCep {
  tipoLogradouro: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface RespostaViaCep {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

/** O ViaCEP devolve "Avenida Angélica"; o cadastro guarda tipo e nome separados. */
export function separarTipoLogradouro(completo: string): { tipo: string; nome: string } {
  const [primeira, ...resto] = completo.trim().split(/\s+/);
  const tipo = TIPOS_LOGRADOURO.find(
    (candidato) => candidato.toLowerCase() === primeira?.toLowerCase(),
  );
  return tipo && resto.length > 0
    ? { tipo, nome: resto.join(' ') }
    : { tipo: '', nome: completo.trim() };
}

/**
 * Consulta o CEP no ViaCEP. Qualquer falha (rede, CEP inexistente) devolve
 * null: o preenchimento é conveniência, o cliente sempre pode digitar.
 */
export async function buscarCep(cep: string): Promise<EnderecoDoCep | null> {
  const digitos = apenasDigitos(cep);
  if (digitos.length !== 8) return null;

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as RespostaViaCep;
    if (dados.erro) return null;

    const { tipo, nome } = separarTipoLogradouro(dados.logradouro ?? '');
    return {
      tipoLogradouro: tipo,
      logradouro: nome,
      bairro: dados.bairro ?? '',
      cidade: dados.localidade ?? '',
      estado: dados.uf ?? '',
    };
  } catch {
    return null;
  }
}
