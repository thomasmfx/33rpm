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

/** RN0041: o item da compra e quantas unidades dele o cliente devolve. */
@Entity
@Table(name = "troca_item")
public class TrocaItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "troca_id")
  private Troca troca;

  @JsonIgnore
  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "item_pedido_id", insertable = false, updatable = false)
  private ItemPedido itemPedido;

  @Column(name = "item_pedido_id")
  private Long itemPedidoId;

  private Integer quantidade;

  public Long getDiscoId() {
    return itemPedido == null ? null : itemPedido.getDiscoId();
  }

  public String getTitulo() {
    return itemPedido == null ? null : itemPedido.getTitulo();
  }

  public String getArtista() {
    return itemPedido == null ? null : itemPedido.getArtista();
  }

  public String getCapaUrl() {
    return itemPedido == null ? null : itemPedido.getCapaUrl();
  }

  public String getCapaMiniaturaUrl() {
    return itemPedido == null ? null : itemPedido.getCapaMiniaturaUrl();
  }

  public BigDecimal getPrecoUnitario() {
    return itemPedido == null ? null : itemPedido.getPrecoUnitario();
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Troca getTroca() {
    return troca;
  }

  public void setTroca(Troca troca) {
    this.troca = troca;
  }

  public ItemPedido getItemPedido() {
    return itemPedido;
  }

  public void setItemPedido(ItemPedido itemPedido) {
    this.itemPedido = itemPedido;
  }

  public Long getItemPedidoId() {
    return itemPedidoId;
  }

  public void setItemPedidoId(Long itemPedidoId) {
    this.itemPedidoId = itemPedidoId;
  }

  public Integer getQuantidade() {
    return quantidade;
  }

  public void setQuantidade(Integer quantidade) {
    this.quantidade = quantidade;
  }
}
