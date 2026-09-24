import styles from './Carrinho.module.scss';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button } from '@mantine/core';
import { useLoja } from '../../contexts/loja';
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio';
import AvisoReserva from '../../components/AvisoReserva/AvisoReserva';
import Capa from '../../components/Capa/Capa';
import Quantidade from '../../components/Quantidade/Quantidade';
import type { AjusteCarrinho } from '../../utils/carrinho';
import { formatarBRL } from '../../utils/precificacao';
import { nomeFormato } from '../../utils/catalogo';
import { estoqueAcabando } from '../../utils/estoque';
import { calcularSubtotal, itensDoCarrinho } from '../../utils/checkout';

function Carrinho() {
  const {
    carrinho,
    discos,
    itensNoCarrinho,
    alterarQuantidade,
    removerDoCarrinho,
    limparCarrinho,
    itensExpirados,
    descartarItensExpirados,
    sincronizarCarrinho,
    adicionarAoCarrinho,
  } = useLoja();
  const navegar = useNavigate();

  const [ajustes, setAjustes] = useState<AjusteCarrinho[]>([]);

  const itens = itensDoCarrinho(carrinho, discos);
  const subtotal = calcularSubtotal(itens);

  function handleReadicionarExpirados(): void {
    itensExpirados.forEach((item) => adicionarAoCarrinho(item.discoId, item.quantidade));
    descartarItensExpirados();
  }

  // RN0032: o estoque pode ter mudado; ajusta e avisa antes de seguir
  function handleFinalizarCompra(): void {
    const novosAjustes = sincronizarCarrinho();
    if (novosAjustes.length > 0) {
      setAjustes(novosAjustes);
      return;
    }
    navegar('/checkout');
  }

  // RN0045: o que caiu por expiração pode voltar com um clique
  const alertaExpirados = itensExpirados.length > 0 && (
    <Alert color="red" title="Itens removidos por expiração" data-testid="alerta-expirados">
      <div className={styles.alertaCorpo}>
        <span>O prazo de reserva acabou e estes discos saíram do seu carrinho:</span>
        <ul>
          {itensExpirados.map((item) => {
            const disco = discos.find((candidato) => candidato.id === item.discoId);
            return (
              <li key={item.discoId}>
                {disco?.title ?? 'Disco indisponível'} · {item.quantidade}×
              </li>
            );
          })}
        </ul>
        <div className={styles.alertaAcoes}>
          <Button size="xs" onClick={handleReadicionarExpirados}>
            Adicionar novamente
          </Button>
          <Button size="xs" variant="default" onClick={descartarItensExpirados}>
            Dispensar
          </Button>
        </div>
      </div>
    </Alert>
  );

  if (itens.length === 0) {
    return (
      <main className={styles.main}>
        {alertaExpirados}
        <EstadoVazio
          titulo="Seu carrinho está vazio"
          descricao="Nenhum disco por aqui ainda. Vá ao acervo e comece a garimpar."
          rotuloAcao="Explorar o acervo"
          paraAcao="/acervo"
        />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.layout}>
        <div className={styles.coluna}>
          <div className={styles.topo}>
            <h1>Carrinho</h1>
            <button type="button" className={styles.esvaziar} onClick={limparCarrinho}>
              Esvaziar
            </button>
          </div>

          {alertaExpirados}

          {ajustes.length > 0 && (
            <Alert color="orange" title="Carrinho ajustado ao estoque">
              {ajustes.map((ajuste) => (
                <div key={ajuste.discoId}>
                  {ajuste.quantidadeNova > 0
                    ? `${ajuste.titulo}: ${ajuste.quantidadeAnterior} → ${ajuste.quantidadeNova} unidade(s)`
                    : `${ajuste.titulo}: removido, sem estoque`}
                </div>
              ))}
            </Alert>
          )}

          <ul className={styles.itens}>
            {itens.map(({ disco, quantidade }) => (
              <li key={disco.id} className={styles.item}>
                <Link to={`/disco/${disco.id}`} className={styles.capa}>
                  <Capa src={disco.coverSrc} alt={disco.title} />
                </Link>

                <div className={styles.texto}>
                  <span className={styles.artista}>{disco.artist}</span>
                  <Link to={`/disco/${disco.id}`} className={styles.titulo}>
                    {disco.title}
                  </Link>
                  <span
                    className={styles.meta}
                    data-alerta={estoqueAcabando(disco.estoque) || undefined}
                  >
                    {nomeFormato(disco.formatoId)} ·{' '}
                    {estoqueAcabando(disco.estoque)
                      ? `Últimas ${disco.estoque}`
                      : `${disco.estoque} em estoque`}
                  </span>
                </div>

                <Quantidade
                  tamanho="sm"
                  valor={quantidade}
                  maximo={disco.estoque}
                  rotulo={`Quantidade de ${disco.title}`}
                  onChange={(valor) => alterarQuantidade(disco.id, valor)}
                />

                <div className={styles.valor}>
                  <strong>{formatarBRL(disco.price * quantidade)}</strong>
                  <button
                    type="button"
                    className={styles.remover}
                    aria-label={`Remover ${disco.title}`}
                    onClick={() => removerDoCarrinho(disco.id)}
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className={styles.resumo}>
          <h2>Resumo</h2>
          <div className={styles.linha}>
            <span>
              Subtotal · {itensNoCarrinho} {itensNoCarrinho === 1 ? 'disco' : 'discos'}
            </span>
            <span>{formatarBRL(subtotal)}</span>
          </div>
          <div className={styles.linha}>
            <span>Frete</span>
            <span className={styles.apagado}>calculado no checkout</span>
          </div>
          <div className={styles.total}>
            <span>Total</span>
            <strong>{formatarBRL(subtotal)}</strong>
          </div>
          <Button size="lg" fullWidth onClick={handleFinalizarCompra}>
            Finalizar compra
          </Button>
          <Button variant="default" fullWidth component={Link} to="/acervo">
            Continuar explorando
          </Button>
          <AvisoReserva texto="Seus discos ficam reservados até o fim do contador." />
        </aside>
      </div>
    </main>
  );
}

export default Carrinho;
