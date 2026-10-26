package br.com.rpm33.model;

/** RF0043: os pedidos de troca, opcionalmente de um status, de um cliente ou de uma compra. */
public class TrocaFiltro extends EntidadeDominio {

  private String status;
  private Long clienteId;
  private Long pedidoId;

  @Override
  public String getNomeEntidade() {
    return Troca.class.getSimpleName();
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }

  public Long getPedidoId() {
    return pedidoId;
  }

  public void setPedidoId(Long pedidoId) {
    this.pedidoId = pedidoId;
  }
}
