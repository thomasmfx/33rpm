package br.com.rpm33.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** RN0046: aviso ao cliente, ligado à compra de que fala. */
@Entity
@Table(name = "notificacao")
public class Notificacao extends EntidadeDominio {

  @Column(name = "cliente_id")
  private Long clienteId;

  @Column(name = "pedido_id")
  private Long pedidoId;

  private String mensagem;

  @Column(name = "is_lida")
  private Boolean isLida;

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

  public String getMensagem() {
    return mensagem;
  }

  public void setMensagem(String mensagem) {
    this.mensagem = mensagem;
  }

  public Boolean getIsLida() {
    return isLida;
  }

  public void setIsLida(Boolean isLida) {
    this.isLida = isLida;
  }
}
