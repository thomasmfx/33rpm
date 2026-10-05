package br.com.rpm33.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.ConsultaDisponibilidade;
import br.com.rpm33.model.Disco;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.model.EntradaEstoque;
import br.com.rpm33.model.Fornecedor;
import br.com.rpm33.model.ItemPedido;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.model.PreviaEntrada;
import br.com.rpm33.repository.DiscoRepository;
import br.com.rpm33.repository.EntradaEstoqueRepository;
import br.com.rpm33.repository.FornecedorRepository;

/**
 * Entrada em estoque (RF0051, RF0052) e disponibilidade para a compra (RN0031). A
 * baixa em estoque (RF0053) está fora do escopo desta fase.
 */
@Service(EntradaEstoque.NOME_ENTIDADE)
public class EstoqueService implements IService {

  private final EntradaEstoqueRepository entradaEstoqueRepository;
  private final DiscoRepository discoRepository;
  private final FornecedorRepository fornecedorRepository;
  private final RegistradorLog registradorLog;

  public EstoqueService(EntradaEstoqueRepository entradaEstoqueRepository,
      DiscoRepository discoRepository, FornecedorRepository fornecedorRepository,
      RegistradorLog registradorLog) {
    this.entradaEstoqueRepository = entradaEstoqueRepository;
    this.discoRepository = discoRepository;
    this.fornecedorRepository = fornecedorRepository;
    this.registradorLog = registradorLog;
  }

  /** RF0051 e RN0050: a entrada soma ao estoque e pode reajustar o preço (RF0052). */
  @Override
  @Transactional
  public Resultado salvar(EntidadeDominio entidade) {
    EntradaEstoque entrada = (EntradaEstoque) entidade;
    List<String> erros = new ArrayList<>();
    Disco disco = resolverDisco(entrada.getDiscoId(), erros);
    Fornecedor fornecedor = resolverFornecedor(entrada.getFornecedor(), erros);
    if (entrada.getQuantidade() == null || entrada.getQuantidade() <= 0) {
      erros.add("A quantidade deve ser maior que zero (RN0061).");
    }
    if (entrada.getValorCusto() == null || entrada.getValorCusto().signum() <= 0) {
      erros.add("Informe um valor de custo maior que zero (RN0062).");
    }
    if (entrada.getDataEntrada() == null) {
      erros.add("Informe a data de entrada (RNF0064).");
    }
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
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
    return Resultado.com(salva);
  }

  @Override
  public Resultado alterar(EntidadeDominio entidade) {
    return Resultado.erro("A entrada em estoque não é alterada: registre uma nova entrada.");
  }

  /** Entradas de um disco (ou todas), a prévia do preço e a disponibilidade da RN0031. */
  @Override
  @Transactional(readOnly = true)
  public Resultado consultar(EntidadeDominio entidade) {
    if (entidade instanceof ConsultaDisponibilidade consulta) {
      return validarDisponibilidade(consulta);
    }
    if (entidade instanceof PreviaEntrada previa) {
      return prever(previa);
    }
    EntradaEstoque filtro = (EntradaEstoque) entidade;
    List<EntradaEstoque> entradas = filtro.getDiscoId() == null
        ? entradaEstoqueRepository.findAllByOrderByDataEntradaDescIdDesc()
        : entradaEstoqueRepository.findByDiscoIdOrderByDataEntradaDescIdDesc(filtro.getDiscoId());
    return Resultado.de(entradas);
  }

  @Override
  public Resultado excluir(EntidadeDominio entidade) {
    return Resultado.erro("A entrada em estoque não é excluída: ela compõe o histórico de custo.");
  }

  /**
   * RN0031: cada disco existe, está ativo e tem estoque para a quantidade pedida. A
   * consulta volta com os itens agrupados por disco e com o disco de cada um, mesmo
   * quando há pendência, para o pedido calcular o que der.
   */
  private Resultado validarDisponibilidade(ConsultaDisponibilidade consulta) {
    if (consulta.getItens() == null || consulta.getItens().isEmpty()) {
      return Resultado.erro("O carrinho está vazio.");
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

    Map<Long, Disco> discos = discoRepository
        .findAllById(porDisco.keySet().stream().filter(Objects::nonNull).toList()).stream()
        .collect(Collectors.toMap(Disco::getId, Function.identity()));
    for (ItemPedido item : porDisco.values()) {
      Disco disco = discos.get(item.getDiscoId());
      if (disco == null) {
        erros.add("RN0031: o disco " + item.getDiscoId() + " não existe.");
        continue;
      }
      item.setDisco(disco);
      if (!Boolean.TRUE.equals(disco.getIsAtivo())) {
        erros.add("RN0031: " + disco.getTitulo() + " não está disponível.");
      } else if (item.getQuantidade() > disco.getEstoque()) {
        erros.add("RN0031: só há " + disco.getEstoque() + " unidade(s) de " + disco.getTitulo()
            + " em estoque.");
      }
    }
    consulta.setItens(new ArrayList<>(porDisco.values()));
    return erros.isEmpty() ? Resultado.com(consulta) : Resultado.erro(erros);
  }

  /** RF0052: o preço e o estoque que a entrada produziria, sem gravar nada. */
  private Resultado prever(PreviaEntrada previa) {
    List<String> erros = new ArrayList<>();
    Disco disco = resolverDisco(previa.getDiscoId(), erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
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
    return Resultado.com(previa);
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
      erros.add("Informe o disco da entrada (RN0050).");
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
      erros.add("Informe o fornecedor da entrada (RN0050).");
      return null;
    }
    Optional<Fornecedor> encontrado = informado.getId() != null
        ? fornecedorRepository.findById(informado.getId())
        : fornecedorRepository.findByNomeIgnoreCase(informado.getNome().trim());
    if (encontrado.isEmpty()) {
      String nome = vazio(informado.getNome()) ? String.valueOf(informado.getId())
          : informado.getNome().trim();
      erros.add("Fornecedor " + nome + " não registrado no sistema (RN0050).");
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
