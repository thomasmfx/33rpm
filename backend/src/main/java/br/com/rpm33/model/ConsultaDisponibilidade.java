package br.com.rpm33.model;

import java.util.ArrayList;
import java.util.List;

/**
 * RN0031: os itens que o cliente quer comprar, com a quantidade total de cada disco.
 * Resolvida pelo EstoqueService, para o carrinho e para o pedido.
 */
public class ConsultaDisponibilidade extends EntidadeDominio {

  private List<ItemPedido> itens = new ArrayList<>();

  @Override
  public String getNomeEntidade() {
    return EntradaEstoque.NOME_ENTIDADE;
  }

  public List<ItemPedido> getItens() {
    return itens;
  }

  public void setItens(List<ItemPedido> itens) {
    this.itens = itens;
  }
}
