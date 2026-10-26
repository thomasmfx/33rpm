package br.com.rpm33.service;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.ComposicaoPagamento;
import br.com.rpm33.model.Cupom;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.model.PagamentoCartao;
import br.com.rpm33.model.Pedido;
import br.com.rpm33.model.TipoCupom;
import br.com.rpm33.model.ValidacaoPagamento;
import br.com.rpm33.repository.CupomRepository;

/**
 * Composição do pagamento (fig11, compor): cupons e cartões contra o total da compra,
 * pelas RN0033 a RN0036. Validação depois da finalização (RN0037), com a operadora de
 * cartão simulada. Não grava nada; quem grava é o PedidoService.
 */
@Service("Pagamento")
public class PagamentoService implements IService {

  private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
  private static final BigDecimal MINIMO_POR_CARTAO = new BigDecimal("10.00");

  private final CupomRepository cupomRepository;
  private final List<String> cartoesRecusados;

  public PagamentoService(CupomRepository cupomRepository,
      @Value("${app.operadora.cartoes-recusados}") List<String> cartoesRecusados) {
    this.cupomRepository = cupomRepository;
    this.cartoesRecusados = cartoesRecusados;
  }

  @Override
  public Resultado salvar(EntidadeDominio entidade) {
    return Resultado.erro("O pagamento só é composto, dentro do pedido.");
  }

  @Override
  public Resultado alterar(EntidadeDominio entidade) {
    return Resultado.erro("O pagamento só é composto, dentro do pedido.");
  }

  /**
   * A composição volta preenchida (cupons conferidos, restante e troco) mesmo quando há
   * pendência, porque a cotação do checkout mostra os valores junto com as mensagens.
   */
  @Override
  @Transactional(readOnly = true)
  public Resultado consultar(EntidadeDominio entidade) {
    if (entidade instanceof ValidacaoPagamento validacao) {
      return validar(validacao);
    }
    ComposicaoPagamento composicao = (ComposicaoPagamento) entidade;
    List<String> erros = new ArrayList<>();
    List<Cupom> cupons = conferirCupons(composicao, erros);
    composicao.setCupons(cupons);

    long promocionais = cupons.stream()
        .filter(cupom -> TipoCupom.PROMOCIONAL.equals(cupom.getTipo().getDesc())).count();
    if (promocionais > 1) {
      erros.add("RN0033: apenas um cupom promocional por compra.");
    }

    BigDecimal total = composicao.getTotal();
    BigDecimal soma = cupons.stream().map(Cupom::getValor).reduce(ZERO, BigDecimal::add);
    // RN0036: dispensável é o cupom sem o qual os demais já cobrem o total. Cita-se o de
    // menor valor, com o código de desempate, para a recusa não depender da ordem da escolha
    cupons.stream()
        .filter(cupom -> soma.subtract(cupom.getValor()).compareTo(total) >= 0)
        .min(Comparator.comparing(Cupom::getValor).thenComparing(Cupom::getCodigo))
        .ifPresent(cupom -> erros.add("RN0036: o cupom " + cupom.getCodigo()
            + " é dispensável — os demais já cobrem o total."));

    BigDecimal restante = total.subtract(soma).max(ZERO);
    composicao.setValorCupons(soma);
    composicao.setRestante(restante);
    composicao.setTroco(soma.subtract(total).max(ZERO));
    erros.addAll(conferirCartoes(composicao.getPagamentos(), restante, !cupons.isEmpty()));
    return erros.isEmpty() ? Resultado.com(composicao) : Resultado.erro(erros);
  }

  @Override
  public Resultado excluir(EntidadeDominio entidade) {
    return Resultado.erro("O pagamento só é composto, dentro do pedido.");
  }

  /**
   * RN0037: depois da finalização, cada cupom é conferido de novo — do cliente, consumido
   * e usado só por esta compra —, cupons e cartões fecham o total, e cada cartão passa
   * pelo aceite da operadora simulada, que recusa os números de app.operadora. A
   * validação volta preenchida; reprovar não é erro da operação.
   */
  private Resultado validar(ValidacaoPagamento validacao) {
    Pedido pedido = validacao.getPedido();
    List<String> motivos = new ArrayList<>();
    for (Cupom cupom : pedido.getCupons()) {
      if (!cupom.getClienteId().equals(pedido.getClienteId())) {
        motivos.add("O cupom " + cupom.getCodigo() + " não é do cliente.");
      } else if (!Boolean.TRUE.equals(cupom.getIsUtilizado())
          || cupomRepository.comprasQueUsaram(cupom.getId()) > 1) {
        motivos.add("O cupom " + cupom.getCodigo() + " não vale para esta compra.");
      }
    }

    // RN0036: a diferença guardada na finalização; o cupom dela só nasce se a compra passar
    BigDecimal pago = pedido.getCupons().stream().map(Cupom::getValor).reduce(ZERO, BigDecimal::add)
        .subtract(pedido.getTroco())
        .add(pedido.getPagamentos().stream().map(PagamentoCartao::getValor)
            .reduce(ZERO, BigDecimal::add));
    if (pago.compareTo(pedido.getTotal()) != 0) {
      motivos.add("Os pagamentos somam " + reais(pago) + " e a compra, " + reais(pedido.getTotal())
          + ".");
    }

    for (PagamentoCartao cartao : pedido.getPagamentos()) {
      if (cartoesRecusados.contains(cartao.getNumero())) {
        motivos.add("A operadora recusou o cartão final " + cartao.getFinalNumero() + ".");
      }
    }
    validacao.setAprovado(motivos.isEmpty());
    validacao.setMotivo(motivos.isEmpty() ? null : String.join(" ", motivos));
    return Resultado.com(validacao);
  }

  /** Cada cupom existe, é do cliente, não foi usado e aparece uma vez só. */
  private List<Cupom> conferirCupons(ComposicaoPagamento composicao, List<String> erros) {
    Map<Long, Cupom> encontrados = cupomRepository
        .findAllById(composicao.getCupons().stream().map(Cupom::getId)
            .filter(Objects::nonNull).toList())
        .stream().collect(Collectors.toMap(Cupom::getId, Function.identity()));

    List<Cupom> conferidos = new ArrayList<>();
    Set<Long> escolhidos = new HashSet<>();
    for (Cupom informado : composicao.getCupons()) {
      Cupom cupom = encontrados.get(informado.getId());
      if (cupom == null) {
        erros.add("O cupom " + informado.getId() + " não existe.");
      } else if (!cupom.getClienteId().equals(composicao.getClienteId())) {
        erros.add("O cupom " + cupom.getCodigo() + " não é do cliente.");
      } else if (Boolean.TRUE.equals(cupom.getIsUtilizado())) {
        erros.add("O cupom " + cupom.getCodigo() + " já foi utilizado.");
      } else if (!escolhidos.add(cupom.getId())) {
        erros.add("O cupom " + cupom.getCodigo() + " foi escolhido duas vezes.");
      } else {
        conferidos.add(cupom);
      }
    }
    return conferidos;
  }

  /**
   * RN0034 e RN0035, na leitura estrita (D5): sem cupom, todo cartão recebe ao menos
   * R$ 10,00; com cupom, uma sobra abaixo disso vai inteira para um único cartão.
   */
  private List<String> conferirCartoes(List<PagamentoCartao> pagamentos, BigDecimal restante,
      boolean comCupom) {
    List<String> erros = new ArrayList<>();
    if (restante.signum() == 0) {
      if (!pagamentos.isEmpty()) {
        erros.add("Os cupons cobrem o total: não há valor para cobrar no cartão.");
      }
      return erros;
    }
    if (pagamentos.isEmpty()) {
      erros.add("Escolha ao menos um cartão para pagar " + reais(restante) + ".");
      return erros;
    }

    if (pagamentos.stream().anyMatch(pagamento -> !positivo(pagamento.getValor()))) {
      erros.add("Todo cartão escolhido precisa receber um valor.");
    }
    // o valor é gravado com dois decimais; mais casas fariam a soma gravada divergir do total
    if (pagamentos.stream().anyMatch(pagamento -> positivo(pagamento.getValor())
        && pagamento.getValor().stripTrailingZeros().scale() > 2)) {
      erros.add("O valor de cada cartão vai até os centavos.");
    }
    BigDecimal soma = pagamentos.stream().map(PagamentoCartao::getValor)
        .filter(Objects::nonNull).reduce(ZERO, BigDecimal::add);
    if (soma.compareTo(restante) != 0) {
      erros.add("Os cartões somam " + reais(soma) + " e o valor a pagar é " + reais(restante)
          + ".");
    }
    if (comCupom && restante.compareTo(MINIMO_POR_CARTAO) < 0) {
      if (pagamentos.size() > 1) {
        erros.add("RN0035: com cupons, a sobra de " + reais(restante)
            + " fica em um único cartão.");
      }
    } else if (pagamentos.stream().anyMatch(pagamento -> positivo(pagamento.getValor())
        && pagamento.getValor().compareTo(MINIMO_POR_CARTAO) < 0)) {
      erros.add("RN0034: cada cartão precisa receber ao menos R$ 10,00.");
    }
    return erros;
  }

  private static boolean positivo(BigDecimal valor) {
    return valor != null && valor.signum() > 0;
  }

  /** Dinheiro nas mensagens como a interface mostra: R$ 1.234,56. */
  private static String reais(BigDecimal valor) {
    DecimalFormat formato =
        new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(Locale.of("pt", "BR")));
    return "R$ " + formato.format(valor);
  }
}
