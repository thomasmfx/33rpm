package br.com.rpm33.model;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * RF0031 e RN0044: o disco no carrinho do cliente, que bloqueia a quantidade no estoque
 * enquanto o prazo do carrinho não vence.
 */
@Entity
@Table(name = "carrinho_item")
public class ItemCarrinho extends EntidadeDominio {

  @Column(name = "cliente_id")
  private Long clienteId;

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "disco_id", insertable = false, updatable = false)
  private Disco disco;

  @Column(name = "disco_id")
  private Long discoId;

  private Integer quantidade;

  /** RN0044: o prazo do carrinho conta da inclusão mais recente. */
  @Column(name = "data_inclusao")
  private LocalDateTime dataInclusao;

  /** RN0045 e RNF0042: saiu do carrinho pelo prazo e espera o cliente incluir de novo. */
  @Column(name = "is_expirado")
  private Boolean isExpirado;

  @Override
  public String getNomeEntidade() {
    return Carrinho.class.getSimpleName();
  }

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
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

  public Integer getQuantidade() {
    return quantidade;
  }

  public void setQuantidade(Integer quantidade) {
    this.quantidade = quantidade;
  }

  public LocalDateTime getDataInclusao() {
    return dataInclusao;
  }

  public void setDataInclusao(LocalDateTime dataInclusao) {
    this.dataInclusao = dataInclusao;
  }

  public Boolean getIsExpirado() {
    return isExpirado;
  }

  public void setIsExpirado(Boolean isExpirado) {
    this.isExpirado = isExpirado;
  }
}
