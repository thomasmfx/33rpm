package br.com.rpm33.model;

/** Checkout e Meus cupons: os cupons de um cliente, opcionalmente só os não utilizados. */
public class CupomFiltro extends EntidadeDominio {

  private Long clienteId;
  private Boolean disponiveis;

  @Override
  public String getNomeEntidade() {
    return Cupom.class.getSimpleName();
  }

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }

  public Boolean getDisponiveis() {
    return disponiveis;
  }

  public void setDisponiveis(Boolean disponiveis) {
    this.disponiveis = disponiveis;
  }
}
