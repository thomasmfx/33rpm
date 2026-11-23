package br.com.rpm33.model;

import java.util.ArrayList;
import java.util.List;

/** O que o chat manda ao assistente: a pergunta nova e as trocas anteriores da conversa. */
public class MensagemAssistente {

  private Long clienteId;
  private String mensagem;
  private List<Turno> historico = new ArrayList<>();

  /** autor: "cliente" ou "assistente". */
  public record Turno(String autor, String texto) {
  }

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }

  public String getMensagem() {
    return mensagem;
  }

  public void setMensagem(String mensagem) {
    this.mensagem = mensagem;
  }

  public List<Turno> getHistorico() {
    return historico;
  }

  public void setHistorico(List<Turno> historico) {
    this.historico = historico;
  }
}
