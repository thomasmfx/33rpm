package br.com.rpm33.model;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** RF0031 e RF0033: disco e quantidade; no pedido gravado, também o preço do momento. */
@Entity
@Table(name = "item_pedido")
public class ItemPedido {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "pedido_id")
  private Pedido pedido;

  @JsonIgnore
  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "disco_id")
  private Disco disco;

  @Column(name = "disco_id", insertable = false, updatable = false)
  private Long discoId;

  @Column(name = "preco_unitario", precision = 10, scale = 2)
  private BigDecimal precoUnitario;

  private Integer quantidade;

  public String getTitulo() {
    return disco == null ? null : disco.getTitulo();
  }

  public String getArtista() {
    return disco == null || disco.getArtista() == null ? null : disco.getArtista().getNome();
  }

  public String getCapaUrl() {
    return disco == null ? null : disco.getCapaUrl();
  }

  public String getCapaMiniaturaUrl() {
    return disco == null ? null : disco.getCapaMiniaturaUrl();
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Pedido getPedido() {
    return pedido;
  }

  public void setPedido(Pedido pedido) {
    this.pedido = pedido;
  }

  public Disco getDisco() {
    return disco;
  }

  public void setDisco(Disco disco) {
    this.disco = disco;
  }

  public Long getDiscoId() {
    return discoId;
  }

  public void setDiscoId(Long discoId) {
    this.discoId = discoId;
  }

  public BigDecimal getPrecoUnitario() {
    return precoUnitario;
  }

  public void setPrecoUnitario(BigDecimal precoUnitario) {
    this.precoUnitario = precoUnitario;
  }

  public Integer getQuantidade() {
    return quantidade;
  }

  public void setQuantidade(Integer quantidade) {
    this.quantidade = quantidade;
  }
}
