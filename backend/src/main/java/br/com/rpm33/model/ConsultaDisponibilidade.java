package br.com.rpm33.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * RN0031: os itens que o cliente quer comprar, com a quantidade total de cada disco.
 * Resolvida pelo EstoqueService, para o carrinho e para o pedido.
 */
public class ConsultaDisponibilidade extends EntidadeDominio {

  private List<ItemPedido> itens = new ArrayList<>();
  /** RN0044: o que o próprio cliente bloqueou no carrinho não conta contra ele. */
  private Long clienteId;
  /** RN0032: quanto de cada disco está livre para o cliente, para o carrinho se ajustar. */
  private Map<Long, Integer> livres = new HashMap<>();

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

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }

  public Map<Long, Integer> getLivres() {
    return livres;
  }

  public void setLivres(Map<Long, Integer> livres) {
    this.livres = livres;
  }
}
