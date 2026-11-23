package br.com.rpm33.service;

/** A IA generativa não respondeu: rede, credencial, cota ou resposta vazia. */
public class IaIndisponivelException extends RuntimeException {

  public IaIndisponivelException(String mensagem) {
    super(mensagem);
  }

  public IaIndisponivelException(String mensagem, Throwable causa) {
    super(mensagem, causa);
  }
}
