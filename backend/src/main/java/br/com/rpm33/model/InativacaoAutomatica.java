package br.com.rpm33.model;

/**
 * RF0013 e RN0016: pedido de execução da rotina que inativa os discos parados. Trafega
 * pela Fachada em alterar e é resolvido pelo DiscoService.
 */
public class InativacaoAutomatica extends EntidadeDominio {

  @Override
  public String getNomeEntidade() {
    return Disco.class.getSimpleName();
  }
}
