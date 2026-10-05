package br.com.rpm33.model;

/** Meus pedidos: os pedidos de um cliente, do mais recente para o mais antigo. */
public class PedidoFiltro extends EntidadeDominio {

  private Long clienteId;

  @Override
  public String getNomeEntidade() {
    return Pedido.class.getSimpleName();
  }

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }
}
