package br.com.rpm33.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

/** RNF0044: uma pergunta do cliente ao assistente, a resposta da IA e a avaliação dela. */
@Entity
@Table(name = "interacao_assistente")
public class InteracaoAssistente extends EntidadeDominio {

  @Column(name = "cliente_id")
  private Long clienteId;

  private String pergunta;

  private String resposta;

  /** O perfil que a IA recebeu; volta no treino, junto com a resposta avaliada como útil. */
  @JsonIgnore
  @Column(name = "contexto_cliente")
  private String contextoCliente;

  @Column(length = 300)
  private String modelo;

  @Column(name = "is_util")
  private Boolean isUtil;

  @Column(name = "data_avaliacao")
  private LocalDateTime dataAvaliacao;

  @OneToMany(mappedBy = "interacao", cascade = CascadeType.ALL, orphanRemoval = true,
      fetch = FetchType.EAGER)
  @OrderBy("id")
  private List<SugestaoAssistente> sugestoes = new ArrayList<>();

  /** Só a listagem da curadoria preenche. */
  @Transient
  private String clienteNome;

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }

  public String getPergunta() {
    return pergunta;
  }

  public void setPergunta(String pergunta) {
    this.pergunta = pergunta;
  }

  public String getResposta() {
    return resposta;
  }

  public void setResposta(String resposta) {
    this.resposta = resposta;
  }

  public String getContextoCliente() {
    return contextoCliente;
  }

  public void setContextoCliente(String contextoCliente) {
    this.contextoCliente = contextoCliente;
  }

  public String getModelo() {
    return modelo;
  }

  public void setModelo(String modelo) {
    this.modelo = modelo;
  }

  public Boolean getIsUtil() {
    return isUtil;
  }

  public void setIsUtil(Boolean isUtil) {
    this.isUtil = isUtil;
  }

  public LocalDateTime getDataAvaliacao() {
    return dataAvaliacao;
  }

  public void setDataAvaliacao(LocalDateTime dataAvaliacao) {
    this.dataAvaliacao = dataAvaliacao;
  }

  public List<SugestaoAssistente> getSugestoes() {
    return sugestoes;
  }

  public void setSugestoes(List<SugestaoAssistente> sugestoes) {
    this.sugestoes = sugestoes;
  }

  public String getClienteNome() {
    return clienteNome;
  }

  public void setClienteNome(String clienteNome) {
    this.clienteNome = clienteNome;
  }
}
