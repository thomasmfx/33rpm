package br.com.rpm33.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;

/**
 * Superclasse de todas as entidades que trafegam pela Fachada. As quatro
 * operações (inserir, alterar, consultar, excluir) recebem sempre este tipo.
 */
@MappedSuperclass
public abstract class EntidadeDominio {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "data_cadastro", insertable = false, updatable = false)
  private LocalDateTime dataCadastro;

  /** Chave do serviço no Map da Fachada. Filtros devolvem o nome da entidade que consultam. */
  public String getNomeEntidade() {
    return getClass().getSimpleName();
  }

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
