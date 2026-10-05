import {
  CATEGORIAS_ATIVACAO,
  CATEGORIAS_INATIVACAO,
  FORNECEDORES,
  GENEROS,
} from '../types/inventario';
import { requisitar } from './api';

interface Descritor {
  id: number;
  desc: string;
}

/** Só as chaves que o cadastro de disco e o estoque usam; "generos" do JSON é o do cliente. */
interface DominiosApi {
  fornecedores: { id: number; nome: string }[];
  categorias: (Descritor & { tipo: 'genero' | 'estilo' })[];
  categoriasStatus: (Descritor & { tipo: 'inativacao' | 'ativacao' })[];
}

/** RNF0013: tabelas de domínio do disco e do estoque, como o banco as carrega. */
export interface DominiosDisco {
  generos: string[];
  estilos: string[];
  fornecedores: string[];
  categoriasInativacao: string[];
  categoriasAtivacao: string[];
}

/** As mesmas listas do seed, para a tela funcionar enquanto o servidor não responde. */
export const DOMINIOS_DISCO_PADRAO: DominiosDisco = {
  generos: GENEROS,
  estilos: [],
  fornecedores: FORNECEDORES,
  categoriasInativacao: CATEGORIAS_INATIVACAO,
  categoriasAtivacao: CATEGORIAS_ATIVACAO,
};

export async function buscarDominiosDisco(): Promise<DominiosDisco> {
  const bruto = await requisitar<DominiosApi>('/dominios');
  const descricoes = <T extends Descritor>(lista: T[], filtro: (item: T) => boolean) =>
    lista.filter(filtro).map((item) => item.desc);

  return {
    generos: descricoes(bruto.categorias, (categoria) => categoria.tipo === 'genero'),
    estilos: descricoes(bruto.categorias, (categoria) => categoria.tipo === 'estilo'),
    fornecedores: bruto.fornecedores.map((fornecedor) => fornecedor.nome),
    categoriasInativacao: descricoes(bruto.categoriasStatus, (status) => status.tipo === 'inativacao'),
    categoriasAtivacao: descricoes(bruto.categoriasStatus, (status) => status.tipo === 'ativacao'),
  };
}
