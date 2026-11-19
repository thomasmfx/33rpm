package br.com.rpm33.service;

import java.util.List;

/**
 * Recusa por regra de negócio; o controlador devolve as mensagens em 400. Por ser
 * RuntimeException, desfaz a transação do serviço: nada do que ele já tinha gravado fica.
 */
public class RegraNegocioException extends RuntimeException {

  private final List<String> mensagens;

  public RegraNegocioException(String mensagem) {
    this(List.of(mensagem));
  }

  public RegraNegocioException(List<String> mensagens) {
    super(String.join(" ", mensagens));
    this.mensagens = List.copyOf(mensagens);
  }

  public List<String> getMensagens() {
    return mensagens;
  }
}
