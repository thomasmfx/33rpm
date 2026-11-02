package br.com.rpm33.service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.LongStream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.AnaliseVendas;
import br.com.rpm33.model.Categoria;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.model.SerieVendas;
import br.com.rpm33.repository.CategoriaRepository;
import br.com.rpm33.repository.PedidoRepository;

/**
 * RF0055: histórico de vendas por categoria e mês. Só leitura: a análise não grava nada.
 * A venda é a compra ENTREGUE, e o mês é o da compra.
 */
@Service("Analise")
public class AnaliseService implements IService {

  /** RN0072 */
  private static final int PERIODO_MAXIMO_MESES = 24;

  private final PedidoRepository pedidoRepository;
  private final CategoriaRepository categoriaRepository;

  public AnaliseService(PedidoRepository pedidoRepository,
      CategoriaRepository categoriaRepository) {
    this.pedidoRepository = pedidoRepository;
    this.categoriaRepository = categoriaRepository;
  }

  @Override
  public Resultado salvar(EntidadeDominio entidade) {
    return Resultado.erro("A análise é só consulta.");
  }

  @Override
  public Resultado alterar(EntidadeDominio entidade) {
    return Resultado.erro("A análise é só consulta.");
  }

  @Override
  @Transactional(readOnly = true)
  public Resultado consultar(EntidadeDominio entidade) {
    AnaliseVendas consulta = (AnaliseVendas) entidade;
    List<String> erros = new ArrayList<>();
    Set<String> categorias = validarCategorias(consulta.getCategorias(), erros);
    validarPeriodo(consulta, erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }

    List<YearMonth> meses = mesesDoPeriodo(consulta);
    Map<String, Map<YearMonth, BigDecimal>> vendido = new HashMap<>();
    for (Object[] linha : pedidoRepository.vendasEntreguesPorMesECategoria(
        consulta.getInicio().atStartOfDay(), consulta.getFim().plusDays(1).atStartOfDay(),
        categorias)) {
      YearMonth mes = YearMonth.of(((Number) linha[0]).intValue(), ((Number) linha[1]).intValue());
      vendido.computeIfAbsent((String) linha[2], categoria -> new HashMap<>())
          .put(mes, (BigDecimal) linha[3]);
    }

    consulta.setMeses(meses.stream().map(YearMonth::toString).toList());
    consulta.setCategorias(new ArrayList<>(categorias));
    consulta.setSeries(categorias.stream()
        .map(categoria -> new SerieVendas(categoria, meses.stream()
            // RN0073: mês sem venda vale zero, para a linha seguir contínua
            .map(mes -> vendido.getOrDefault(categoria, Map.of())
                .getOrDefault(mes, BigDecimal.ZERO).setScale(2))
            .toList()))
        .toList());
    return Resultado.com(consulta);
  }

  @Override
  public Resultado excluir(EntidadeDominio entidade) {
    return Resultado.erro("A análise é só consulta.");
  }

  /** RF0057: ao menos uma categoria, cada uma um gênero do acervo (RNF0013). */
  private Set<String> validarCategorias(List<String> informadas, List<String> erros) {
    Set<String> categorias = new LinkedHashSet<>();
    for (String informada : informadas == null ? List.<String>of() : informadas) {
      Optional<Categoria> genero = categoriaRepository
          .findByDescIgnoreCaseAndTipo(informada.trim(), Categoria.GENERO);
      if (genero.isPresent()) {
        categorias.add(genero.get().getDesc());
      } else {
        erros.add("Categoria " + informada + " não registrada no sistema.");
      }
    }
    if (categorias.isEmpty() && erros.isEmpty()) {
      erros.add("Selecione ao menos uma categoria.");
    }
    return categorias;
  }

  /** RF0056 e RN0072: o fim não vem antes do início, e o período cabe em 24 meses. */
  private void validarPeriodo(AnaliseVendas consulta, List<String> erros) {
    if (consulta.getInicio() == null || consulta.getFim() == null) {
      erros.add("Informe a data de início e a data de fim.");
      return;
    }
    if (consulta.getFim().isBefore(consulta.getInicio())) {
      erros.add("A data de fim não pode ser anterior à de início.");
      return;
    }
    int quantidade = mesesDoPeriodo(consulta).size();
    if (quantidade > PERIODO_MAXIMO_MESES) {
      erros.add("O período deve ter no máximo " + PERIODO_MAXIMO_MESES
          + " meses (selecionou " + quantidade + ").");
    }
  }

  /** RN0071: todos os meses tocados pelo período, do primeiro ao último. */
  private List<YearMonth> mesesDoPeriodo(AnaliseVendas consulta) {
    YearMonth primeiro = YearMonth.from(consulta.getInicio());
    long quantidade = ChronoUnit.MONTHS.between(primeiro, YearMonth.from(consulta.getFim())) + 1;
    return LongStream.range(0, quantidade).mapToObj(primeiro::plusMonths).toList();
  }
}
