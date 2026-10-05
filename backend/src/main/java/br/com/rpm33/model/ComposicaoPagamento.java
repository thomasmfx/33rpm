package br.com.rpm33.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * RN0033 a RN0036: cupons e cartões escolhidos contra o total da compra (fig11,
 * compor). Resolvida pelo PagamentoService, que devolve aqui os cupons conferidos,
 * o restante para os cartões e o troco.
 */
public class ComposicaoPagamento extends EntidadeDominio {

  private Long clienteId;
  private BigDecimal total;
  private List<Cupom> cupons = new ArrayList<>();
  private List<PagamentoCartao> pagamentos = new ArrayList<>();
  private BigDecimal valorCupons;
  private BigDecimal restante;
  private BigDecimal troco;

  @Override
  public String getNomeEntidade() {
    return "Pagamento";
  }

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }

  public BigDecimal getTotal() {
    return total;
  }

  public void setTotal(BigDecimal total) {
    this.total = total;
  }

  public List<Cupom> getCupons() {
    return cupons;
  }

  public void setCupons(List<Cupom> cupons) {
    this.cupons = cupons;
  }

  public List<PagamentoCartao> getPagamentos() {
    return pagamentos;
  }

  public void setPagamentos(List<PagamentoCartao> pagamentos) {
    this.pagamentos = pagamentos;
  }

  public BigDecimal getValorCupons() {
    return valorCupons;
  }

  public void setValorCupons(BigDecimal valorCupons) {
    this.valorCupons = valorCupons;
  }

  public BigDecimal getRestante() {
    return restante;
  }

  public void setRestante(BigDecimal restante) {
    this.restante = restante;
  }

  public BigDecimal getTroco() {
    return troco;
  }

  public void setTroco(BigDecimal troco) {
    this.troco = troco;
  }
}
