import type { Cliente, FiltrosClientes } from '../types/cliente';
import { contemDigitos, contemTexto } from './texto';
import { telefoneCompleto } from './perfilCliente';

export const FILTROS_VAZIOS: FiltrosClientes = {
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  id: '',
  status: 'todos',
  rankingMinimo: 0,
};

export function filtrarClientes(
  clientes: Cliente[],
  filtros: FiltrosClientes,
): Cliente[] {
  return clientes.filter(
    (cliente) =>
      contemTexto(cliente.nome, filtros.nome) &&
      contemTexto(cliente.email, filtros.email) &&
      contemTexto(cliente.id, filtros.id) &&
      contemDigitos(telefoneCompleto(cliente.telefone), filtros.telefone) &&
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
