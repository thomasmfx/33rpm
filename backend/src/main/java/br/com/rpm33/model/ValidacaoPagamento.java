package br.com.rpm33.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

/**
 * RN0037 e RN0038: a conferência dos cupons e o aceite da operadora para um pedido.
 * O PagamentoService decide; o PedidoService grava e muda o status.
 */
@Entity
@Table(name = "validacao_pagamento")
@AttributeOverride(name = "dataCadastro",
    column = @Column(name = "data", insertable = false, updatable = false))
public class ValidacaoPagamento extends EntidadeDominio {

  @JsonIgnore
  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "pedido_id")
  private Pedido pedido;

  @Column(name = "pedido_id", insertable = false, updatable = false)
  private Long pedidoId;

  private Boolean aprovado;

  /** O que reprovou a compra; nulo na aprovada. */
  private String motivo;

  @Override
  public String getNomeEntidade() {
    return "Pagamento";
  }

  public Pedido getPedido() {
    return pedido;
  }

  public void setPedido(Pedido pedido) {
    this.pedido = pedido;
  }

  public Long getPedidoId() {
    return pedidoId;
  }

  public void setPedidoId(Long pedidoId) {
    this.pedidoId = pedidoId;
  }

  public Boolean getAprovado() {
    return aprovado;
  }

  public void setAprovado(Boolean aprovado) {
    this.aprovado = aprovado;
  }

  public String getMotivo() {
    return motivo;
  }

  public void setMotivo(String motivo) {
    this.motivo = motivo;
  }
}
