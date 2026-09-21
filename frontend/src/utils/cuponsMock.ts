import type { Cliente } from '../types/cliente';
import type { Cupom } from '../types/cupom';

/**
 * Promocionais valem para qualquer cliente (clienteId null); os de troca
 * pertencem a quem devolveu o item. Valores fictícios.
 */
const PROMOCIONAIS: Cupom[] = [
  { id: 'cup-1', codigo: 'BEMVINDO20', tipo: 'promocional', valor: 20, clienteId: null, isUtilizado: false },
  { id: 'cup-2', codigo: 'VINIL50', tipo: 'promocional', valor: 50, clienteId: null, isUtilizado: false },
  { id: 'cup-3', codigo: 'FRETEGRATIS30', tipo: 'promocional', valor: 30, clienteId: null, isUtilizado: false },
];

// O dono do cupom de troca é resolvido na carga, porque o id do cliente vem do banco
const MODELOS_DE_TROCA = [
  { id: 'cup-4', codigo: 'TROCA-AC-118', valor: 229, indiceDoCliente: 0 },
  { id: 'cup-5', codigo: 'TROCA-AC-204', valor: 45, indiceDoCliente: 0 },
  { id: 'cup-6', codigo: 'TROCA-CE-077', valor: 120, indiceDoCliente: 1 },
];

export function gerarCupons(clientes: Cliente[]): Cupom[] {
  const deTroca: Cupom[] = MODELOS_DE_TROCA.filter(
    (modelo) => clientes[modelo.indiceDoCliente],
  ).map((modelo) => ({
    id: modelo.id,
    codigo: modelo.codigo,
    tipo: 'troca',
    valor: modelo.valor,
    clienteId: clientes[modelo.indiceDoCliente].id,
    isUtilizado: false,
  }));

  return [...PROMOCIONAIS, ...deTroca];
}
