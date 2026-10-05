package br.com.rpm33.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Prensagem do disco, com as dimensões-padrão que o cadastro sugere (RN0011). */
@Entity
@Table(name = "formato")
public class Formato {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(length = 20)
  private String nome;

  @Column(length = 60)
  private String descricao;

  @Column(precision = 5, scale = 2)
  private BigDecimal altura;

  @Column(precision = 5, scale = 2)
  private BigDecimal largura;

  @Column(precision = 5, scale = 2)
  private BigDecimal profundidade;

  private Integer peso;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getNome() {
    return nome;
  }

  public void setNome(String nome) {
    this.nome = nome;
  }

  public String getDescricao() {
    return descricao;
  }

  public void setDescricao(String descricao) {
    this.descricao = descricao;
  }

  public BigDecimal getAltura() {
    return altura;
  }

  public void setAltura(BigDecimal altura) {
    this.altura = altura;
  }

  public BigDecimal getLargura() {
    return largura;
  }

  public void setLargura(BigDecimal largura) {
    this.largura = largura;
  }

  public BigDecimal getProfundidade() {
    return profundidade;
  }

  public void setProfundidade(BigDecimal profundidade) {
    this.profundidade = profundidade;
  }

  public Integer getPeso() {
    return peso;
  }

  public void setPeso(Integer peso) {
    this.peso = peso;
  }
}
