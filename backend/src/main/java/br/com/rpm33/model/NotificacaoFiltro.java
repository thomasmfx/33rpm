package br.com.rpm33.model;

/** RN0046: as notificações de um cliente, da mais recente para a mais antiga. */
public class NotificacaoFiltro extends EntidadeDominio {

  private Long clienteId;

  @Override
  public String getNomeEntidade() {
    return Notificacao.class.getSimpleName();
  }

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }
}
