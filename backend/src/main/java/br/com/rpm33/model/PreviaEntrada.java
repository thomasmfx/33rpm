package br.com.rpm33.model;

import java.math.BigDecimal;

/**
 * RF0052: preço e estoque que o disco teria com a entrada informada, calculados pela
 * mesma regra da gravação. Nada é gravado.
 */
public class PreviaEntrada extends EntidadeDominio {

  private Long discoId;
  private Integer quantidade;
  private BigDecimal valorCusto;
  private BigDecimal precoAtual;
  private BigDecimal precoSugerido;
  private BigDecimal precoResultante;
  private Integer estoqueAtual;
  private Integer estoqueResultante;

  @Override
  public String getNomeEntidade() {
    return EntradaEstoque.NOME_ENTIDADE;
  }

  public Long getDiscoId() {
    return discoId;
  }

  public void setDiscoId(Long discoId) {
    this.discoId = discoId;
  }

  public Integer getQuantidade() {
    return quantidade;
  }

  public void setQuantidade(Integer quantidade) {
    this.quantidade = quantidade;
  }

  public BigDecimal getValorCusto() {
    return valorCusto;
  }

  public void setValorCusto(BigDecimal valorCusto) {
    this.valorCusto = valorCusto;
  }

  public BigDecimal getPrecoAtual() {
    return precoAtual;
  }

  public void setPrecoAtual(BigDecimal precoAtual) {
    this.precoAtual = precoAtual;
  }

  public BigDecimal getPrecoSugerido() {
    return precoSugerido;
  }

  public void setPrecoSugerido(BigDecimal precoSugerido) {
    this.precoSugerido = precoSugerido;
  }

  public BigDecimal getPrecoResultante() {
    return precoResultante;
  }

  public void setPrecoResultante(BigDecimal precoResultante) {
    this.precoResultante = precoResultante;
  }

  public Integer getEstoqueAtual() {
    return estoqueAtual;
  }

  public void setEstoqueAtual(Integer estoqueAtual) {
    this.estoqueAtual = estoqueAtual;
  }

  public Integer getEstoqueResultante() {
    return estoqueResultante;
  }

  public void setEstoqueResultante(Integer estoqueResultante) {
    this.estoqueResultante = estoqueResultante;
  }
}
