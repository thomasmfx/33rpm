package br.com.rpm33.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** RNF0043: a linha de uma categoria, com o valor vendido em cada mês de {@link AnaliseVendas}. */
public class SerieVendas {

  private String categoria;
  private List<BigDecimal> valores = new ArrayList<>();

  public SerieVendas() {
  }

  public SerieVendas(String categoria, List<BigDecimal> valores) {
    this.categoria = categoria;
    this.valores = valores;
  }

  public String getCategoria() {
    return categoria;
  }

  public void setCategoria(String categoria) {
    this.categoria = categoria;
  }

  public List<BigDecimal> getValores() {
    return valores;
  }

  public void setValores(List<BigDecimal> valores) {
    this.valores = valores;
  }
}
