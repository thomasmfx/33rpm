import type { Cupom } from '../types/cupom';

/**
 * Promocionais valem para qualquer cliente (clienteId null); os de troca
 * pertencem a quem devolveu o item. Valores fictícios.
 */
export const cuponsMock: Cupom[] = [
  { id: 'cup-1', codigo: 'BEMVINDO20', tipo: 'promocional', valor: 20, clienteId: null, isUtilizado: false },
  { id: 'cup-2', codigo: 'VINIL50', tipo: 'promocional', valor: 50, clienteId: null, isUtilizado: false },
  { id: 'cup-3', codigo: 'FRETEGRATIS30', tipo: 'promocional', valor: 30, clienteId: null, isUtilizado: false },
  { id: 'cup-4', codigo: 'TROCA-AC-118', tipo: 'troca', valor: 229, clienteId: 'c1-abc-123', isUtilizado: false },
  { id: 'cup-5', codigo: 'TROCA-AC-204', tipo: 'troca', valor: 45, clienteId: 'c1-abc-123', isUtilizado: false },
  { id: 'cup-6', codigo: 'TROCA-CE-077', tipo: 'troca', valor: 120, clienteId: 'c2-def-456', isUtilizado: false },
  { id: 'cup-7', codigo: 'TROCA-BS-091', tipo: 'troca', valor: 310, clienteId: 'c5-mno-345', isUtilizado: false },
];
