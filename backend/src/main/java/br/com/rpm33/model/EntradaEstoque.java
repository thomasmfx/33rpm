package br.com.rpm33.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.hibernate.annotations.Immutable;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * RF0051 e RN0050: disco, quantidade, custo, fornecedor e data de cada entrada. Não
 * muda depois de gravada: é o histórico de custo da RN0051.
 */
@Entity
@Immutable
@Table(name = "entrada_estoque")
public class EntradaEstoque extends EntidadeDominio {

  public static final String NOME_ENTIDADE = "Estoque";

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "disco_id")
  private Disco disco;

  @Column(name = "disco_id", insertable = false, updatable = false)
  private Long discoId;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "fornecedor_id")
  private Fornecedor fornecedor;

  private Integer quantidade;

  @Column(name = "valor_custo", precision = 10, scale = 2)
  private BigDecimal valorCusto;

  @Column(name = "data_entrada")
  private LocalDate dataEntrada;

  @Override
  public String getNomeEntidade() {
    return NOME_ENTIDADE;
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

  public Fornecedor getFornecedor() {
    return fornecedor;
  }

  public void setFornecedor(Fornecedor fornecedor) {
    this.fornecedor = fornecedor;
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

  public LocalDate getDataEntrada() {
    return dataEntrada;
  }

  public void setDataEntrada(LocalDate dataEntrada) {
    this.dataEntrada = dataEntrada;
  }
}
