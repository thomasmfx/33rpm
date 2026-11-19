package br.com.rpm33.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.ConsultaDisponibilidade;
import br.com.rpm33.model.Disco;
import br.com.rpm33.model.EntradaEstoque;
import br.com.rpm33.model.Fornecedor;
import br.com.rpm33.model.ItemPedido;
import br.com.rpm33.model.MovimentoEstoque;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.model.PreviaEntrada;
import br.com.rpm33.repository.DiscoRepository;
import br.com.rpm33.repository.EntradaEstoqueRepository;
import br.com.rpm33.repository.FornecedorRepository;
import br.com.rpm33.repository.ItemCarrinhoRepository;
import br.com.rpm33.repository.PedidoRepository;

/**
 * Entrada em estoque (RF0051, RF0052), disponibilidade para a compra (RN0031, RN0044),
 * baixa da venda aprovada (RF0053) e reentrada da troca (RF0054). A entrada não é
 * alterada nem excluída: ela compõe o histórico de custo.
 */
@Service
public class EstoqueService {

  private final EntradaEstoqueRepository entradaEstoqueRepository;
  private final DiscoRepository discoRepository;
  private final FornecedorRepository fornecedorRepository;
  private final ItemCarrinhoRepository itemCarrinhoRepository;
  private final PedidoRepository pedidoRepository;
  private final RegistradorLog registradorLog;
  private final int prazoCarrinhoMinutos;

  public EstoqueService(EntradaEstoqueRepository entradaEstoqueRepository,
      DiscoRepository discoRepository, FornecedorRepository fornecedorRepository,
      ItemCarrinhoRepository itemCarrinhoRepository, PedidoRepository pedidoRepository,
      RegistradorLog registradorLog,
      @Value("${app.carrinho.prazo-minutos}") int prazoCarrinhoMinutos) {
    this.entradaEstoqueRepository = entradaEstoqueRepository;
    this.discoRepository = discoRepository;
    this.fornecedorRepository = fornecedorRepository;
    this.itemCarrinhoRepository = itemCarrinhoRepository;
    this.pedidoRepository = pedidoRepository;
    this.registradorLog = registradorLog;
    this.prazoCarrinhoMinutos = prazoCarrinhoMinutos;
  }

  /** RF0051 e RN0050: a entrada soma ao estoque e pode reajustar o preço (RF0052). */
  @Transactional
  public EntradaEstoque registrarEntrada(EntradaEstoque entrada) {
    List<String> erros = new ArrayList<>();
    Disco disco = resolverDisco(entrada.getDiscoId(), erros);
    Fornecedor fornecedor = resolverFornecedor(entrada.getFornecedor(), erros);
    if (entrada.getQuantidade() == null || entrada.getQuantidade() <= 0) {
      erros.add("A quantidade deve ser maior que zero.");
    }
    if (entrada.getValorCusto() == null || entrada.getValorCusto().signum() <= 0) {
      erros.add("Informe um valor de custo maior que zero.");
    }
    if (entrada.getDataEntrada() == null) {
      erros.add("Informe a data de entrada.");
    }
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }

    BigDecimal custo = entrada.getValorCusto().setScale(2, RoundingMode.HALF_UP);
    Reprecificacao reprecificacao =
        reprecificar(disco, maior(entradaEstoqueRepository.maiorCusto(disco.getId()), custo));

    EntradaEstoque nova = new EntradaEstoque();
    nova.setDisco(disco);
    nova.setDiscoId(disco.getId());
    nova.setFornecedor(fornecedor);
    nova.setQuantidade(entrada.getQuantidade());
    nova.setValorCusto(custo);
    nova.setDataEntrada(entrada.getDataEntrada());
    EntradaEstoque salva = entradaEstoqueRepository.save(nova);

    disco.setEstoque(disco.getEstoque() + entrada.getQuantidade());
    disco.setPrecoVenda(reprecificacao.preco());
    disco.setAutorizacaoGerente(reprecificacao.autorizacao());

    registrar(salva, disco);
    return salva;
  }

  /** As entradas de um disco, ou todas, da mais recente para a mais antiga. */
  @Transactional(readOnly = true)
  public List<EntradaEstoque> consultarEntradas(Long discoId) {
    return discoId == null
        ? entradaEstoqueRepository.findAllByOrderByDataEntradaDescIdDesc()
        : entradaEstoqueRepository.findByDiscoIdOrderByDataEntradaDescIdDesc(discoId);
  }

  /** RN0031 e RN0044 na consulta avulsa da API: o que não estiver disponível é recusado. */
  @Transactional(readOnly = true)
  public ConsultaDisponibilidade validarDisponibilidade(ConsultaDisponibilidade consulta) {
    List<String> pendencias = conferirDisponibilidade(consulta);
    if (!pendencias.isEmpty()) {
      throw new RegraNegocioException(pendencias);
    }
    return consulta;
  }

  /**
   * RN0031 e RN0044: cada disco existe, está ativo e tem estoque livre para a quantidade
   * pedida. Livre é o estoque menos o que outros carrinhos ainda no prazo bloqueiam e o
   * que as compras EM PROCESSAMENTO reservam (RN0028). A consulta volta com os itens
   * agrupados por disco e com o disco de cada um, mesmo quando há pendência, para o
   * pedido calcular o que der; por isso as pendências voltam como lista, não como recusa.
   */
  @Transactional(readOnly = true)
  public List<String> conferirDisponibilidade(ConsultaDisponibilidade consulta) {
    if (consulta.getItens() == null || consulta.getItens().isEmpty()) {
      return List.of("O carrinho está vazio.");
    }
    List<String> erros = new ArrayList<>();
    Map<Long, ItemPedido> porDisco = new LinkedHashMap<>();
    for (ItemPedido item : consulta.getItens()) {
      if (item.getQuantidade() == null || item.getQuantidade() < 1) {
        erros.add("Informe uma quantidade maior que zero.");
        continue;
      }
      ItemPedido mesmoDisco = porDisco.get(item.getDiscoId());
      if (mesmoDisco == null) {
        porDisco.put(item.getDiscoId(), item);
      } else {
        mesmoDisco.setQuantidade(mesmoDisco.getQuantidade() + item.getQuantidade());
      }
    }

    List<Long> ids = porDisco.keySet().stream().filter(Objects::nonNull).toList();
    Map<Long, Disco> discos = discoRepository.findAllById(ids).stream()
        .collect(Collectors.toMap(Disco::getId, Function.identity()));
    Map<Long, Integer> reservados = reservados(ids, consulta.getClienteId());
    for (ItemPedido item : porDisco.values()) {
      Disco disco = discos.get(item.getDiscoId());
      if (disco == null) {
        erros.add("O disco " + item.getDiscoId() + " não existe.");
        continue;
      }
      item.setDisco(disco);
      int reservado = reservados.getOrDefault(disco.getId(), 0);
      int livre = Math.max(0, disco.getEstoque() - reservado);
      consulta.getLivres().put(disco.getId(), Boolean.TRUE.equals(disco.getIsAtivo()) ? livre : 0);
      if (!Boolean.TRUE.equals(disco.getIsAtivo())) {
        erros.add(disco.getTitulo() + " não está disponível.");
      } else if (item.getQuantidade() > livre && reservado == 0) {
        erros.add("Só há " + disco.getEstoque() + " unidade(s) de " + disco.getTitulo()
            + " em estoque.");
      } else if (item.getQuantidade() > livre) {
        erros.add("Só há " + livre + " unidade(s) livre(s) de " + disco.getTitulo()
            + "; as demais estão reservadas em outras compras.");
      }
    }
    consulta.setItens(new ArrayList<>(porDisco.values()));
    return erros;
  }

  /**
   * RN0044 e RN0028: unidades de cada disco presas em carrinhos de outros clientes, ainda
   * no prazo, e em compras EM PROCESSAMENTO, inclusive as do próprio cliente.
   */
  private Map<Long, Integer> reservados(Collection<Long> discoIds, Long clienteId) {
    Map<Long, Integer> reservados = new HashMap<>();
    if (discoIds.isEmpty()) {
      return reservados;
    }
    LocalDateTime limite = LocalDateTime.now().minusMinutes(prazoCarrinhoMinutos);
    // sem cliente, como na consulta avulsa de disponibilidade, todo carrinho conta
    Long dono = clienteId == null ? -1L : clienteId;
    List<Object[]> somas =
        new ArrayList<>(itemCarrinhoRepository.bloqueadosPorOutros(discoIds, dono, limite));
    somas.addAll(pedidoRepository.reservadosEmProcessamento(discoIds));
    for (Object[] soma : somas) {
      reservados.merge((Long) soma[0], ((Number) soma[1]).intValue(), Integer::sum);
    }
    return reservados;
  }

  /**
   * RF0053: a venda aprovada sai do estoque. RF0054: o item trocado volta. O pedido já
   * reservava as unidades da baixa, então faltar estoque aqui é defeito, não regra.
   */
  @Transactional
  public List<Disco> movimentar(MovimentoEstoque movimento) {
    boolean baixa = MovimentoEstoque.BAIXA.equals(movimento.getTipo());
    List<Disco> movimentados = new ArrayList<>();
    for (ItemPedido item : movimento.getItens()) {
      Disco disco = discoRepository.findById(item.getDiscoId()).orElseThrow(
          () -> new IllegalStateException("Disco " + item.getDiscoId() + " ausente."));
      int saldo = disco.getEstoque() + (baixa ? -item.getQuantidade() : item.getQuantidade());
      if (saldo < 0) {
        throw new IllegalStateException(
            "Baixa de " + item.getQuantidade() + " em " + disco.getTitulo() + " sem estoque.");
      }
      disco.setEstoque(saldo);

      Map<String, Object> dados = new LinkedHashMap<>();
      dados.put("codigo", disco.getCodigo());
      dados.put("titulo", disco.getTitulo());
      dados.put("movimento", movimento.getTipo());
      dados.put("quantidade", item.getQuantidade());
      dados.put("estoque", saldo);
      dados.put("origem", movimento.getOrigem());
      registradorLog.registrar(OperacaoLog.ALTERAR, Disco.class.getSimpleName(), disco.getId(),
          dados, movimento.getUsuario());
      movimentados.add(disco);
    }
    return movimentados;
  }

  /** RF0052: o preço e o estoque que a entrada produziria, sem gravar nada. */
  @Transactional(readOnly = true)
  public PreviaEntrada prever(PreviaEntrada previa) {
    List<String> erros = new ArrayList<>();
    Disco disco = resolverDisco(previa.getDiscoId(), erros);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    // a prévia acompanha a digitação: quantidade ou custo ainda vazios só ficam fora da conta
    int quantidade = previa.getQuantidade() == null || previa.getQuantidade() < 0
        ? 0 : previa.getQuantidade();
    BigDecimal maiorCusto = entradaEstoqueRepository.maiorCusto(disco.getId());
    if (previa.getValorCusto() != null && previa.getValorCusto().signum() > 0) {
      maiorCusto = maior(maiorCusto, previa.getValorCusto().setScale(2, RoundingMode.HALF_UP));
    }
    Reprecificacao reprecificacao = reprecificar(disco, maiorCusto);

    previa.setPrecoAtual(disco.getPrecoVenda());
    previa.setPrecoSugerido(reprecificacao.sugerido());
    previa.setPrecoResultante(reprecificacao.preco());
    previa.setEstoqueAtual(disco.getEstoque());
    previa.setEstoqueResultante(disco.getEstoque() + quantidade);
    return previa;
  }

  /**
   * RN0051, RN0013 e RF0052: o preço sobe para o maior custo mais a margem do grupo,
   * nunca desce. A prévia e a gravação usam esta mesma conta de propósito: feitas em
   * separado, a tela prometeria um reajuste que a gravação não aplicaria.
   */
  private Reprecificacao reprecificar(Disco disco, BigDecimal maiorCusto) {
    BigDecimal sugerido = RegrasPreco.sugerido(maiorCusto, disco.getGrupoPrecificacao());
    BigDecimal preco = disco.getPrecoVenda();
    // RN0014: uma entrada não desfaz sozinha o preço que o gerente autorizou abaixo da margem
    if (disco.getAutorizacaoGerente() == null && sugerido != null
        && sugerido.compareTo(preco.add(RegrasPreco.TOLERANCIA)) > 0) {
      preco = sugerido;
    }
    // a exceção da RN0014 caduca quando o preço volta para dentro da margem
    String autorizacao =
        RegrasPreco.exigeAutorizacao(preco, sugerido) ? disco.getAutorizacaoGerente() : null;
    return new Reprecificacao(preco, sugerido, autorizacao);
  }

  private record Reprecificacao(BigDecimal preco, BigDecimal sugerido, String autorizacao) {
  }

  private Disco resolverDisco(Long discoId, List<String> erros) {
    if (discoId == null) {
      erros.add("Informe o disco da entrada.");
      return null;
    }
    Optional<Disco> disco = discoRepository.findById(discoId);
    if (disco.isEmpty()) {
      erros.add("Disco não encontrado.");
      return null;
    }
    return disco.get();
  }

  /** RN0050: todo item de estoque vem de um fornecedor registrado. */
  private Fornecedor resolverFornecedor(Fornecedor informado, List<String> erros) {
    if (informado == null || (informado.getId() == null && vazio(informado.getNome()))) {
      erros.add("Informe o fornecedor da entrada.");
      return null;
    }
    Optional<Fornecedor> encontrado = informado.getId() != null
        ? fornecedorRepository.findById(informado.getId())
        : fornecedorRepository.findByNomeIgnoreCase(informado.getNome().trim());
    if (encontrado.isEmpty()) {
      String nome = vazio(informado.getNome()) ? String.valueOf(informado.getId())
          : informado.getNome().trim();
      erros.add("Fornecedor " + nome + " não registrado no sistema.");
      return null;
    }
    return encontrado.get();
  }

  private void registrar(EntradaEstoque entrada, Disco disco) {
    Map<String, Object> dadosEntrada = new LinkedHashMap<>();
    dadosEntrada.put("discoId", disco.getId());
    dadosEntrada.put("disco", disco.getCodigo());
    dadosEntrada.put("fornecedor", entrada.getFornecedor().getNome());
    dadosEntrada.put("quantidade", entrada.getQuantidade());
    dadosEntrada.put("valorCusto", entrada.getValorCusto());
    dadosEntrada.put("dataEntrada", entrada.getDataEntrada().toString());
    registradorLog.registrar(OperacaoLog.INSERIR, EntradaEstoque.class.getSimpleName(),
        entrada.getId(), dadosEntrada, RegistradorLog.CURADORIA);

    Map<String, Object> dadosDisco = new LinkedHashMap<>();
    dadosDisco.put("codigo", disco.getCodigo());
    dadosDisco.put("titulo", disco.getTitulo());
    dadosDisco.put("estoque", disco.getEstoque());
    dadosDisco.put("precoVenda", disco.getPrecoVenda());
    dadosDisco.put("autorizacaoGerente", disco.getAutorizacaoGerente());
    registradorLog.registrar(OperacaoLog.ALTERAR, Disco.class.getSimpleName(), disco.getId(),
        dadosDisco, RegistradorLog.CURADORIA);
  }

  private static BigDecimal maior(BigDecimal atual, BigDecimal candidato) {
    return atual == null || candidato.compareTo(atual) > 0 ? candidato : atual;
  }

  private static boolean vazio(String valor) {
    return valor == null || valor.isBlank();
  }
}
