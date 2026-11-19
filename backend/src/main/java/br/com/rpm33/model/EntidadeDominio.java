package br.com.rpm33.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.Generated;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;

/** Superclasse das entidades persistentes: o id e a data de cadastro de toda tabela. */
@MappedSuperclass
public abstract class EntidadeDominio {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /** Default do banco; volta no próprio INSERT (RETURNING), sem consulta a mais. */
  @Generated
  @Column(name = "data_cadastro", insertable = false, updatable = false)
  private LocalDateTime dataCadastro;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public LocalDateTime getDataCadastro() {
    return dataCadastro;
  }

  public void setDataCadastro(LocalDateTime dataCadastro) {
    this.dataCadastro = dataCadastro;
  }
}
