package br.com.rpm33.model;

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

/** Um disco que o assistente sugeriu numa resposta, com o motivo que a IA deu. */
@Entity
@Table(name = "sugestao_assistente")
public class SugestaoAssistente {

  public static final String AFINIDADE = "afinidade";
  public static final String DESCOBERTA = "descoberta";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "interacao_id")
  private InteracaoAssistente interacao;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "disco_id")
  private Disco disco;

  @Column(length = 300)
  private String motivo;

  @Column(length = 12)
  private String tipo;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public InteracaoAssistente getInteracao() {
    return interacao;
  }

  public void setInteracao(InteracaoAssistente interacao) {
    this.interacao = interacao;
  }

  public Disco getDisco() {
    return disco;
  }

  public void setDisco(Disco disco) {
    this.disco = disco;
  }

  public String getMotivo() {
    return motivo;
  }

  public void setMotivo(String motivo) {
    this.motivo = motivo;
  }

  public String getTipo() {
    return tipo;
  }

  public void setTipo(String tipo) {
    this.tipo = tipo;
  }
}
