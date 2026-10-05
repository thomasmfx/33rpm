package br.com.rpm33.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.annotations.Immutable;

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

/** RN0015, RN0016 e RN0017: histórico das inativações e ativações do disco. */
@Entity
@Immutable
@Table(name = "motivo_status")
public class MotivoStatus {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "disco_id")
  private Disco disco;

  /** O tipo da categoria diz se o registro é de inativação ou de ativação. */
  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "categoria_status_id")
  private CategoriaStatus categoria;

  @Column(columnDefinition = "text")
  private String justificativa;

  /** RN0016: verdadeiro quando quem inativou foi a rotina, não a curadoria. */
  private Boolean automatico;

  /** Default do banco, como as demais datas: o relógio do servidor não entra na conta. */
  @Generated
  @Column(insertable = false, updatable = false)
  private LocalDateTime data;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Disco getDisco() {
    return disco;
  }

  public void setDisco(Disco disco) {
    this.disco = disco;
  }

  public CategoriaStatus getCategoria() {
    return categoria;
  }

  public void setCategoria(CategoriaStatus categoria) {
    this.categoria = categoria;
  }

  public String getJustificativa() {
    return justificativa;
  }

  public void setJustificativa(String justificativa) {
    this.justificativa = justificativa;
  }

  public Boolean getAutomatico() {
    return automatico;
  }

  public void setAutomatico(Boolean automatico) {
    this.automatico = automatico;
  }

  public LocalDateTime getData() {
    return data;
  }

  public void setData(LocalDateTime data) {
    this.data = data;
  }
}
