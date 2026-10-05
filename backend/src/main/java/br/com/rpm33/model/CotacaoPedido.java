package br.com.rpm33.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * Checkout: os valores que o pedido teria e as pendências que impediriam a gravação.
 * Passa pela mesma conferência do PedidoService.salvar, mas nunca grava.
 */
public class CotacaoPedido extends EntidadeDominio {

  @JsonIgnore
  private Pedido pedido;

  private BigDecimal subtotal;
  private Integer pesoTotal;
  private String regiao;
  private BigDecimal frete;
  private BigDecimal total;
  private BigDecimal valorCupons;
  private BigDecimal restante;
  private BigDecimal troco;
  private List<String> pendencias = new ArrayList<>();

  @Override
  public String getNomeEntidade() {
    return Pedido.class.getSimpleName();
  }

  public Pedido getPedido() {
    return pedido;
  }

  public void setPedido(Pedido pedido) {
    this.pedido = pedido;
  }

  public BigDecimal getSubtotal() {
    return subtotal;
  }

  public void setSubtotal(BigDecimal subtotal) {
    this.subtotal = subtotal;
  }

  public Integer getPesoTotal() {
    return pesoTotal;
  }

  public void setPesoTotal(Integer pesoTotal) {
    this.pesoTotal = pesoTotal;
  }

  public String getRegiao() {
    return regiao;
  }

  public void setRegiao(String regiao) {
    this.regiao = regiao;
  }

  public BigDecimal getFrete() {
    return frete;
  }

  public void setFrete(BigDecimal frete) {
    this.frete = frete;
  }

  public BigDecimal getTotal() {
    return total;
  }

  public void setTotal(BigDecimal total) {
    this.total = total;
  }

  public BigDecimal getValorCupons() {
    return valorCupons;
  }

  public void setValorCupons(BigDecimal valorCupons) {
    this.valorCupons = valorCupons;
  }

  public BigDecimal getRestante() {
    return restante;
  }

  public void setRestante(BigDecimal restante) {
    this.restante = restante;
  }

  public BigDecimal getTroco() {
    return troco;
  }

  public void setTroco(BigDecimal troco) {
    this.troco = troco;
  }

  public List<String> getPendencias() {
    return pendencias;
  }

  public void setPendencias(List<String> pendencias) {
    this.pendencias = pendencias;
  }
}
