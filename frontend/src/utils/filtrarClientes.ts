import type { FiltrosClientes } from '../types/cliente';

export const FILTROS_VAZIOS: FiltrosClientes = {
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  codigo: '',
  status: 'todos',
  rankingMinimo: 0,
};

// Conta apenas os critérios do popover — o nome fica na barra de busca
export function contarFiltrosAtivos(filtros: FiltrosClientes): number {
  const criterios = [
    filtros.email.trim() !== '',
    filtros.telefone.trim() !== '',
    filtros.cpf.trim() !== '',
    filtros.codigo.trim() !== '',
    filtros.status !== 'todos',
    filtros.rankingMinimo > 0,
  ];

  return criterios.filter(Boolean).length;
}
