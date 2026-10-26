package br.com.rpm33.model;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** RN0033 a RN0036: cupom de troca ou promocional, sempre de um cliente. */
@Entity
@Table(name = "cupom")
public class Cupom extends EntidadeDominio {

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "cliente_id")
  private Cliente cliente;

  @Column(name = "cliente_id", insertable = false, updatable = false)
  private Long clienteId;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "tipo_cupom_id")
  private TipoCupom tipo;

  @Column(length = 20)
  private String codigo;

  @Column(precision = 10, scale = 2)
  private BigDecimal valor;

  @Column(name = "is_utilizado")
  private Boolean isUtilizado;

  /** RN0036: pedido cujos cupons passaram do total e geraram este cupom de troca. */
  @Column(name = "pedido_origem_id")
  private Long pedidoOrigemId;

  /** RF0045: troca cujos itens chegaram e geraram este cupom de troca. */
  @Column(name = "troca_origem_id")
  private Long trocaOrigemId;

  public Cliente getCliente() {
    return cliente;
  }

  public void setCliente(Cliente cliente) {
    this.cliente = cliente;
  }

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }

  public TipoCupom getTipo() {
    return tipo;
  }

  public void setTipo(TipoCupom tipo) {
    this.tipo = tipo;
  }

  public String getCodigo() {
    return codigo;
  }

  public void setCodigo(String codigo) {
    this.codigo = codigo;
  }

  public BigDecimal getValor() {
    return valor;
  }

  public void setValor(BigDecimal valor) {
    this.valor = valor;
  }

  public Boolean getIsUtilizado() {
    return isUtilizado;
  }

  public void setIsUtilizado(Boolean isUtilizado) {
    this.isUtilizado = isUtilizado;
  }

  public Long getPedidoOrigemId() {
    return pedidoOrigemId;
  }

  public void setPedidoOrigemId(Long pedidoOrigemId) {
    this.pedidoOrigemId = pedidoOrigemId;
  }

  public Long getTrocaOrigemId() {
    return trocaOrigemId;
  }

  public void setTrocaOrigemId(Long trocaOrigemId) {
    this.trocaOrigemId = trocaOrigemId;
  }
}
