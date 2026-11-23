package br.com.rpm33.model;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * RNF0044 item 3: um ajuste fino do modelo com as vendas e o feedback do chat. O mais
 * recente CONCLUIDO é o modelo que o assistente usa.
 */
@Entity
@Table(name = "treinamento_modelo")
public class Treinamento extends EntidadeDominio {

  public static final String EM_TREINAMENTO = "EM TREINAMENTO";
  public static final String CONCLUIDO = "CONCLUIDO";
  public static final String FALHOU = "FALHOU";

  @Column(length = 20)
  private String status;

  @Column(name = "modelo_base", length = 100)
  private String modeloBase;

  @Column(length = 300)
  private String job;

  @Column(name = "modelo_ajustado", length = 300)
  private String modeloAjustado;

  @Column(name = "dataset_uri", length = 300)
  private String datasetUri;

  /** Servido à parte, pela rota do dataset: tem centenas de exemplos. */
  @JsonIgnore
  private String dataset;

  @Column(name = "exemplos_vendas")
  private Integer exemplosVendas;

  @Column(name = "exemplos_feedback")
  private Integer exemplosFeedback;

  @Column(name = "exemplos_acervo")
  private Integer exemplosAcervo;

  @Column(name = "feedbacks_descartados")
  private Integer feedbacksDescartados;

  private String erro;

  @Column(name = "data_conclusao")
  private LocalDateTime dataConclusao;

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getModeloBase() {
    return modeloBase;
  }

  public void setModeloBase(String modeloBase) {
    this.modeloBase = modeloBase;
  }

  public String getJob() {
    return job;
  }

  public void setJob(String job) {
    this.job = job;
  }

  public String getModeloAjustado() {
    return modeloAjustado;
  }

  public void setModeloAjustado(String modeloAjustado) {
    this.modeloAjustado = modeloAjustado;
  }

  public String getDatasetUri() {
    return datasetUri;
  }

  public void setDatasetUri(String datasetUri) {
    this.datasetUri = datasetUri;
  }

  public String getDataset() {
    return dataset;
  }

  public void setDataset(String dataset) {
    this.dataset = dataset;
  }

  public Integer getExemplosVendas() {
    return exemplosVendas;
  }

  public void setExemplosVendas(Integer exemplosVendas) {
    this.exemplosVendas = exemplosVendas;
  }

  public Integer getExemplosFeedback() {
    return exemplosFeedback;
  }

  public void setExemplosFeedback(Integer exemplosFeedback) {
    this.exemplosFeedback = exemplosFeedback;
  }

  public Integer getExemplosAcervo() {
    return exemplosAcervo;
  }

  public void setExemplosAcervo(Integer exemplosAcervo) {
    this.exemplosAcervo = exemplosAcervo;
  }

  public Integer getFeedbacksDescartados() {
    return feedbacksDescartados;
  }

  public void setFeedbacksDescartados(Integer feedbacksDescartados) {
    this.feedbacksDescartados = feedbacksDescartados;
  }

  public String getErro() {
    return erro;
  }

  public void setErro(String erro) {
    this.erro = erro;
  }

  public LocalDateTime getDataConclusao() {
    return dataConclusao;
  }

  public void setDataConclusao(LocalDateTime dataConclusao) {
    this.dataConclusao = dataConclusao;
  }
}
