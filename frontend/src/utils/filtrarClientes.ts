import type { Cliente, FiltrosClientes } from '../types/cliente';

export const FILTROS_VAZIOS: FiltrosClientes = {
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  id: '',
  status: 'todos',
  rankingMinimo: 0,
};

// Remove acentos e caixa para que "juliana" encontre "Juliána"
function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Compara telefone e CPF sem máscara: "1198765" encontra "(11) 98765-4321"
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

function contemTexto(campo: string, termo: string): boolean {
  return !termo.trim() || normalizar(campo).includes(normalizar(termo));
}

function contemDigitos(campo: string, termo: string): boolean {
  const digitos = apenasDigitos(termo);
  return !digitos || apenasDigitos(campo).includes(digitos);
}

export function filtrarClientes(
  clientes: Cliente[],
  filtros: FiltrosClientes,
): Cliente[] {
  return clientes.filter(
    (cliente) =>
      contemTexto(cliente.nome, filtros.nome) &&
      contemTexto(cliente.email, filtros.email) &&
      contemTexto(cliente.id, filtros.id) &&
      contemDigitos(cliente.telefone, filtros.telefone) &&
      contemDigitos(cliente.cpf, filtros.cpf) &&
      (filtros.status === 'todos' ||
        cliente.isAtivo === (filtros.status === 'ativos')) &&
      cliente.ranking >= filtros.rankingMinimo,
  );
}

// Conta apenas os critérios do popover — o nome fica na barra de busca
export function contarFiltrosAtivos(filtros: FiltrosClientes): number {
  const criterios = [
    filtros.email.trim() !== '',
    filtros.telefone.trim() !== '',
    filtros.cpf.trim() !== '',
    filtros.id.trim() !== '',
    filtros.status !== 'todos',
    filtros.rankingMinimo > 0,
  ];

  return criterios.filter(Boolean).length;
}
