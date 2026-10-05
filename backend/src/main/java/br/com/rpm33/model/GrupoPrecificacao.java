package br.com.rpm33.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** RN0013 e RF0052: a margem, em percentual, somada ao custo para formar o preço. */
@Entity
@Table(name = "grupo_precificacao")
public class GrupoPrecificacao {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(length = 60)
  private String nome;

  @Column(name = "margem_lucro", precision = 5, scale = 2)
  private BigDecimal margemLucro;

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

  public BigDecimal getMargemLucro() {
    return margemLucro;
  }

  public void setMargemLucro(BigDecimal margemLucro) {
    this.margemLucro = margemLucro;
  }
}
