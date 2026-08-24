import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Disco } from '../types/disco';
import type { EntradaEstoque } from '../types/inventario';
import type { ItemCarrinho } from '../types/carrinho';
import { discosMock } from '../utils/discosMock';
import { entradasEstoqueMock } from '../utils/estoqueMock';
import { LojaContext } from './loja';

// subir a versão invalida o que está salvo, sem código de migração:
// a chave muda e o localStorage antigo simplesmente deixa de ser lido
const VERSAO = 1;

function ler<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(`33rpm:v${VERSAO}:${chave}`);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave: string, valor: unknown): void {
  localStorage.setItem(`33rpm:v${VERSAO}:${chave}`, JSON.stringify(valor));
}

export default function LojaProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [discos, setDiscos] = useState<Disco[]>(() => ler('discos', discosMock));
  const [entradas, setEntradas] = useState<EntradaEstoque[]>(() =>
    ler('entradas', entradasEstoqueMock),
  );
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>(() => ler('carrinho', []));

  useEffect(() => gravar('discos', discos), [discos]);
  useEffect(() => gravar('entradas', entradas), [entradas]);
  useEffect(() => gravar('carrinho', carrinho), [carrinho]);

  // RN0031: o carrinho nunca passa do que existe em estoque
  const limitarAoEstoque = useCallback(
    (discoId: number, quantidade: number) => {
      const disco = discos.find((candidato) => candidato.id === discoId);
      return Math.max(0, Math.min(quantidade, disco?.estoque ?? 0));
    },
    [discos],
  );

  const adicionarAoCarrinho = useCallback(
    (discoId: number, quantidade: number) => {
      setCarrinho((itens) => {
        const existente = itens.find((item) => item.discoId === discoId);
        const total = limitarAoEstoque(
          discoId,
          (existente?.quantidade ?? 0) + quantidade,
        );
        if (total === 0) return itens;

        return existente
          ? itens.map((item) =>
              item.discoId === discoId ? { ...item, quantidade: total } : item,
            )
          : [...itens, { discoId, quantidade: total }];
      });
    },
    [limitarAoEstoque],
  );

  const alterarQuantidade = useCallback(
    (discoId: number, quantidade: number) => {
      const total = limitarAoEstoque(discoId, quantidade);
      setCarrinho((itens) =>
        total === 0
          ? itens.filter((item) => item.discoId !== discoId)
          : itens.map((item) =>
              item.discoId === discoId ? { ...item, quantidade: total } : item,
            ),
      );
    },
    [limitarAoEstoque],
  );

  const removerDoCarrinho = useCallback((discoId: number) => {
    setCarrinho((itens) => itens.filter((item) => item.discoId !== discoId));
  }, []);

  const limparCarrinho = useCallback(() => setCarrinho([]), []);

  const valor = useMemo(
    () => ({
      discos,
      setDiscos,
      entradas,
      setEntradas,
      carrinho,
      itensNoCarrinho: carrinho.reduce((total, item) => total + item.quantidade, 0),
      adicionarAoCarrinho,
      alterarQuantidade,
      removerDoCarrinho,
      limparCarrinho,
    }),
    [
      discos,
      entradas,
      carrinho,
      adicionarAoCarrinho,
      alterarQuantidade,
      removerDoCarrinho,
      limparCarrinho,
    ],
  );

  return <LojaContext.Provider value={valor}>{children}</LojaContext.Provider>;
}
