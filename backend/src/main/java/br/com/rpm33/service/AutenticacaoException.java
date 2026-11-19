package br.com.rpm33.service;

/** E-mail e senha recusados no login: a resposta é 401, não 400. */
public class AutenticacaoException extends RegraNegocioException {

  public AutenticacaoException(String mensagem) {
    super(mensagem);
  }
}
