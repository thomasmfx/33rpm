import type {
  Cartao,
  Cliente,
  Endereco,
  FiltrosClientes,
} from '../types/cliente';
import type { FormClienteValues } from '../components/FormCliente/FormCliente';
import { requisitar } from './api';

/** Formato do agregado como o backend o serializa: domínios são objetos, não texto. */
interface Descritor {
  id?: number;
  desc: string;
}

interface EnderecoApi {
  id: number;
  nome: string;
  tipo: Endereco['tipo'];
  tipoResidencia: string;
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cep: string;
  pais: string;
  observacoes?: string | null;
  cidade: { id?: number; desc: string; estado: Descritor };
}

interface CartaoApi {
  id: number;
  numero: string;
  nomeImpresso: string;
  codigoSeguranca: string;
  isPreferencial: boolean;
  bandeira: Descritor;
}

interface ClienteApi {
  id: number;
  codigo: string;
  nome: string;
  email: string;
  cpf: string;
  dataNascimento: string | null;
  ranking: number;
  isAtivo: boolean;
  genero: Descritor;
  telefone: { id?: number; tipo: Descritor; ddd: string; numero: string };
  enderecos: EnderecoApi[];
  cartoes: CartaoApi[];
}

function paraCliente(bruto: ClienteApi): Cliente {
  return {
    id: String(bruto.id),
    codigo: bruto.codigo,
    nome: bruto.nome,
    email: bruto.email,
    genero: bruto.genero.desc,
    telefone: {
      tipo: bruto.telefone.tipo.desc,
      ddd: bruto.telefone.ddd,
      numero: bruto.telefone.numero,
    },
    cpf: bruto.cpf,
    dataNascimento: bruto.dataNascimento,
    ranking: bruto.ranking,
    isAtivo: bruto.isAtivo,
    enderecos: bruto.enderecos.map((endereco) => ({
      id: String(endereco.id),
      nome: endereco.nome,
      tipo: endereco.tipo,
      tipoResidencia: endereco.tipoResidencia,
      tipoLogradouro: endereco.tipoLogradouro,
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      bairro: endereco.bairro,
      cep: endereco.cep,
      cidade: endereco.cidade.desc,
      estado: endereco.cidade.estado.desc,
      pais: endereco.pais,
      observacoes: endereco.observacoes ?? '',
    })),
    cartoes: bruto.cartoes.map((cartao) => ({
      id: String(cartao.id),
      numero: cartao.numero,
      nomeImpresso: cartao.nomeImpresso,
      bandeira: cartao.bandeira.desc,
      codigoSeguranca: cartao.codigoSeguranca,
      isPreferencial: cartao.isPreferencial,
    })),
  };
}

function enderecoParaApi(endereco: Endereco) {
  return {
    nome: endereco.nome,
    tipo: endereco.tipo,
    tipoResidencia: endereco.tipoResidencia,
    tipoLogradouro: endereco.tipoLogradouro,
    logradouro: endereco.logradouro,
    numero: endereco.numero,
    bairro: endereco.bairro,
    cep: endereco.cep,
    pais: endereco.pais,
    observacoes: endereco.observacoes,
    cidade: { desc: endereco.cidade, estado: { desc: endereco.estado } },
  };
}

function cartaoParaApi(cartao: Cartao) {
  return {
    numero: cartao.numero,
    nomeImpresso: cartao.nomeImpresso,
    codigoSeguranca: cartao.codigoSeguranca,
    isPreferencial: cartao.isPreferencial,
    bandeira: { desc: cartao.bandeira },
  };
}

function paraPayload(valores: FormClienteValues) {
  return {
    nome: valores.nome,
    email: valores.email,
    cpf: valores.cpf,
    dataNascimento: valores.dataNascimento,
    isAtivo: valores.isAtivo,
    genero: { desc: valores.genero },
    telefone: {
      tipo: { desc: valores.telefone.tipo },
      ddd: valores.telefone.ddd,
      numero: valores.telefone.numero,
    },
    enderecos: valores.enderecos.map(enderecoParaApi),
    cartoes: valores.cartoes.map(cartaoParaApi),
    // RNF0031 e RNF0032: em edição, senha vazia significa 'manter a atual'
    senha: valores.password || undefined,
    confirmarSenha: valores.confirmPassword || undefined,
  };
}

function comoQuery(filtros: FiltrosClientes): string {
  const parametros = new URLSearchParams();
  if (filtros.nome.trim()) parametros.set('nome', filtros.nome.trim());
  if (filtros.email.trim()) parametros.set('email', filtros.email.trim());
  if (filtros.telefone.trim()) parametros.set('telefone', filtros.telefone.trim());
  if (filtros.cpf.trim()) parametros.set('cpf', filtros.cpf.trim());
  if (filtros.codigo.trim()) parametros.set('codigo', filtros.codigo.trim());
  parametros.set('status', filtros.status);
  if (filtros.rankingMinimo > 0) {
    parametros.set('rankingMinimo', String(filtros.rankingMinimo));
  }
  return parametros.toString();
}

/** RF0024 */
export async function listarClientes(filtros: FiltrosClientes): Promise<Cliente[]> {
  const brutos = await requisitar<ClienteApi[]>(`/clientes?${comoQuery(filtros)}`);
  return brutos.map(paraCliente);
}

/** RF0021 */
export async function cadastrarCliente(valores: FormClienteValues): Promise<Cliente> {
  const bruto = await requisitar<ClienteApi>('/clientes', {
    method: 'POST',
    body: JSON.stringify(paraPayload(valores)),
  });
  return paraCliente(bruto);
}

/** RF0022 */
export async function alterarCliente(
  id: string,
  valores: FormClienteValues,
): Promise<Cliente> {
  const bruto = await requisitar<ClienteApi>(`/clientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(paraPayload(valores)),
  });
  return paraCliente(bruto);
}

/** RF0028: troca de senha sem editar o resto do cadastro. */
export async function alterarSenha(
  id: string,
  senha: string,
  confirmarSenha: string,
): Promise<Cliente> {
  const bruto = await requisitar<ClienteApi>(`/clientes/${id}/senha`, {
    method: 'PUT',
    body: JSON.stringify({ senha, confirmarSenha }),
  });
  return paraCliente(bruto);
}

/** RNF0034: endereços alterados sem editar o resto do cadastro. */
export async function alterarEnderecos(
  id: string,
  enderecos: Endereco[],
): Promise<Cliente> {
  const bruto = await requisitar<ClienteApi>(`/clientes/${id}/enderecos`, {
    method: 'PUT',
    body: JSON.stringify({ enderecos: enderecos.map(enderecoParaApi) }),
  });
  return paraCliente(bruto);
}

/** RF0036: cartão novo do checkout incorporado ao perfil. */
export async function alterarCartoes(id: string, cartoes: Cartao[]): Promise<Cliente> {
  const bruto = await requisitar<ClienteApi>(`/clientes/${id}/cartoes`, {
    method: 'PUT',
    body: JSON.stringify({ cartoes: cartoes.map(cartaoParaApi) }),
  });
  return paraCliente(bruto);
}

/** RF0023: inativação. O cadastro permanece no banco. */
export async function inativarCliente(id: string): Promise<Cliente> {
  const bruto = await requisitar<ClienteApi>(`/clientes/${id}`, { method: 'DELETE' });
  return paraCliente(bruto);
}

export async function reativarCliente(id: string): Promise<Cliente> {
  const bruto = await requisitar<ClienteApi>(`/clientes/${id}/ativacao`, {
    method: 'PUT',
    body: JSON.stringify({ isAtivo: true }),
  });
  return paraCliente(bruto);
}

export async function autenticar(email: string, senha: string): Promise<Cliente> {
  const bruto = await requisitar<ClienteApi>('/clientes/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
  return paraCliente(bruto);
}
