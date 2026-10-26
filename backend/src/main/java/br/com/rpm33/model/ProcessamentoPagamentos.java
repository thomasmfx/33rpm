package br.com.rpm33.model;

/**
 * RN0037 e RN0038: pedido de execução da rotina que valida o pagamento dos pedidos EM
 * PROCESSAMENTO, sem esperar a operadora simulada. Trafega pela Fachada em alterar e é
 * resolvido pelo PedidoService.
 */
public class ProcessamentoPagamentos extends EntidadeDominio {

  @Override
  public String getNomeEntidade() {
    return Pedido.class.getSimpleName();
  }
}
