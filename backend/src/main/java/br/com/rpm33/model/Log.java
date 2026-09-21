package br.com.rpm33.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** RNF0012: registro das operações de escrita. */
@Entity
@Table(name = "log")
public class Log {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "operacao_log_id")
  private OperacaoLog operacao;

  @Column(length = 60)
  private String entidade;

  @Column(name = "entidade_id")
  private Long entidadeId;

  @Column(length = 80)
  private String usuario;

  @Column(name = "data_hora", insertable = false, updatable = false)
  private LocalDateTime dataHora;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "dados_alterados")
  private String dadosAlterados;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public OperacaoLog getOperacao() {
    return operacao;
  }

  public void setOperacao(OperacaoLog operacao) {
    this.operacao = operacao;
  }

  public String getEntidade() {
    return entidade;
  }

  public void setEntidade(String entidade) {
    this.entidade = entidade;
  }

  public Long getEntidadeId() {
    return entidadeId;
  }

  public void setEntidadeId(Long entidadeId) {
    this.entidadeId = entidadeId;
  }

  public String getUsuario() {
    return usuario;
  }

  public void setUsuario(String usuario) {
    this.usuario = usuario;
  }

  public LocalDateTime getDataHora() {
    return dataHora;
  }

  public void setDataHora(LocalDateTime dataHora) {
    this.dataHora = dataHora;
  }

  public String getDadosAlterados() {
    return dadosAlterados;
  }

  public void setDadosAlterados(String dadosAlterados) {
    this.dadosAlterados = dadosAlterados;
  }
}
