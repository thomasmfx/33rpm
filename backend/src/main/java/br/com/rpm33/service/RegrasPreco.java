package br.com.rpm33.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import br.com.rpm33.model.GrupoPrecificacao;

/** RF0052, RN0013 e RN0014: as contas de preço que o disco e o estoque compartilham. */
final class RegrasPreco {

  static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

  /**
   * O sugerido sai de uma multiplicação arredondada, então erra por centavos. Sem essa
   * folga, R$ 389,00 contra um sugerido de R$ 389,01 pediria autorização do gerente
   * sem nenhuma margem ter sido furada de verdade.
   */
  static final BigDecimal TOLERANCIA = new BigDecimal("0.01");

  private RegrasPreco() {
  }

  /** RF0052: maior custo mais o percentual do grupo; nulo antes da primeira entrada. */
  static BigDecimal sugerido(BigDecimal maiorCusto, GrupoPrecificacao grupo) {
    if (maiorCusto == null || grupo == null) {
      return null;
    }
    BigDecimal fator = BigDecimal.ONE.add(grupo.getMargemLucro().movePointLeft(2));
    return maiorCusto.multiply(fator).setScale(2, RoundingMode.HALF_UP);
  }

  /** RN0014: dentro da margem o preço muda livremente; abaixo dela, só com autorização. */
  static boolean exigeAutorizacao(BigDecimal preco, BigDecimal sugerido) {
    return sugerido != null && preco.compareTo(sugerido.subtract(TOLERANCIA)) < 0;
  }
}
