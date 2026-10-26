package br.com.rpm33.model;

import java.util.ArrayList;
import java.util.List;

/**
 * RF0053 e RF0054: a baixa da venda aprovada e a reentrada da troca recebida. Não é
 * entrada de fornecedor, então não passa pelo custo nem pela reprecificação.
 */
public class MovimentoEstoque extends EntidadeDominio {

  public static final String BAIXA = "BAIXA";
  public static final String REENTRADA = "REENTRADA";

  private String tipo;
  /** Disco e quantidade de cada item movimentado. */
  private List<ItemPedido> itens = new ArrayList<>();
  /** Para o log: "Pedido 12" ou "Troca 3". */
  private String origem;
  private String usuario;

  public static MovimentoEstoque de(String tipo, List<ItemPedido> itens, String origem,
      String usuario) {
    MovimentoEstoque movimento = new MovimentoEstoque();
    movimento.tipo = tipo;
    movimento.itens = itens;
    movimento.origem = origem;
    movimento.usuario = usuario;
    return movimento;
  }

  @Override
  public String getNomeEntidade() {
    return EntradaEstoque.NOME_ENTIDADE;
  }

  public String getTipo() {
    return tipo;
  }

  public List<ItemPedido> getItens() {
    return itens;
  }

  public String getOrigem() {
    return origem;
  }

  public String getUsuario() {
    return usuario;
  }
}
