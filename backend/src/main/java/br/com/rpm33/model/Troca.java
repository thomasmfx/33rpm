package br.com.rpm33.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import tools.jackson.databind.annotation.JsonDeserialize;

/**
 * RF0041 e RN0041: o pedido de troca de itens de uma compra entregue. Na troca da compra
 * inteira, o pedido acompanha o status da troca.
 */
@Entity
@Table(name = "troca")
public class Troca extends EntidadeDominio {

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "pedido_id")
  private Pedido pedido;

  @Column(name = "pedido_id", insertable = false, updatable = false)
  private Long pedidoId;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "status_pedido_id")
  private StatusPedido status;

  @Column(name = "compra_inteira")
  private Boolean compraInteira;

  private String motivo;

  /** RF0044: o administrador diz, no recebimento, se os itens voltam ao estoque. */
  @Column(name = "retorno_estoque")
  private Boolean retornoEstoque;

  @Column(name = "data_autorizacao")
  private LocalDateTime dataAutorizacao;

  @Column(name = "data_recebimento")
  private LocalDateTime dataRecebimento;

  @OneToMany(mappedBy = "troca", cascade = CascadeType.ALL, orphanRemoval = true,
      fetch = FetchType.EAGER)
  @Fetch(FetchMode.SELECT)
  @OrderBy("id")
  @JsonDeserialize(as = LinkedHashSet.class)
  private Set<TrocaItem> itens = new LinkedHashSet<>();

  /** O dono da compra: confere quem solicita e identifica o cliente na curadoria. */
  @Transient
  private Long clienteId;

  /** RF0045: o cupom gerado pelo recebimento dos itens. */
  @Transient
  private Cupom cupomGerado;

  /** RF0045: o valor do cupom, pelo preço pago por item. */
  public BigDecimal getValor() {
    return itens.stream()
        .map(item -> item.getPrecoUnitario().multiply(BigDecimal.valueOf(item.getQuantidade())))
        .reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
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

  public StatusPedido getStatus() {
    return status;
  }

  public void setStatus(StatusPedido status) {
    this.status = status;
  }

  public Boolean getCompraInteira() {
    return compraInteira;
  }

  public void setCompraInteira(Boolean compraInteira) {
    this.compraInteira = compraInteira;
  }

  public String getMotivo() {
    return motivo;
  }

  public void setMotivo(String motivo) {
    this.motivo = motivo;
  }

  public Boolean getRetornoEstoque() {
    return retornoEstoque;
  }

  public void setRetornoEstoque(Boolean retornoEstoque) {
    this.retornoEstoque = retornoEstoque;
  }

  public LocalDateTime getDataAutorizacao() {
    return dataAutorizacao;
  }

  public void setDataAutorizacao(LocalDateTime dataAutorizacao) {
    this.dataAutorizacao = dataAutorizacao;
  }

  public LocalDateTime getDataRecebimento() {
    return dataRecebimento;
  }

  public void setDataRecebimento(LocalDateTime dataRecebimento) {
    this.dataRecebimento = dataRecebimento;
  }

  public Set<TrocaItem> getItens() {
    return itens;
  }

  public void setItens(Set<TrocaItem> itens) {
    this.itens = itens;
  }

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }

  public Cupom getCupomGerado() {
    return cupomGerado;
  }

  public void setCupomGerado(Cupom cupomGerado) {
    this.cupomGerado = cupomGerado;
  }
}
