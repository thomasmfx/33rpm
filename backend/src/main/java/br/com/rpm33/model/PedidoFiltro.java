package br.com.rpm33.model;

/** Meus pedidos: os pedidos de um cliente, do mais recente para o mais antigo. */
public class PedidoFiltro {

  private Long clienteId;

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }
}
