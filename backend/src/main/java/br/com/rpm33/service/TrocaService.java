package br.com.rpm33.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Cupom;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.model.ItemPedido;
import br.com.rpm33.model.MovimentoEstoque;
import br.com.rpm33.model.Notificacao;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.model.Pedido;
import br.com.rpm33.model.StatusPedido;
import br.com.rpm33.model.TipoCupom;
import br.com.rpm33.model.Troca;
import br.com.rpm33.model.TrocaFiltro;
import br.com.rpm33.model.TrocaItem;
import br.com.rpm33.repository.CupomRepository;
import br.com.rpm33.repository.PedidoRepository;
import br.com.rpm33.repository.StatusPedidoRepository;
import br.com.rpm33.repository.TrocaRepository;

/**
 * Trocas (RF0041 a RF0045, RN0041 a RN0043). O cliente pede a troca de itens de uma compra
 * ENTREGUE, ou dela inteira; o administrador autoriza, com notificação ao cliente
 * (RN0046), e confirma o recebimento, que gera o cupom de troca e devolve os itens ao
 * estoque quando ele assim informa (RF0054). Recusa de troca e estorno no cartão não
 * estão no DRS.
 */
@Service("Troca")
public class TrocaService implements IService {

  private final TrocaRepository trocaRepository;
  private final PedidoRepository pedidoRepository;
  private final StatusPedidoRepository statusPedidoRepository;
  private final CupomRepository cupomRepository;
  private final IService cupons;
  private final IService estoque;
  private final IService notificacoes;
  private final RegistradorLog registradorLog;

  public TrocaService(TrocaRepository trocaRepository, PedidoRepository pedidoRepository,
      StatusPedidoRepository statusPedidoRepository, CupomRepository cupomRepository,
      @Qualifier("Cupom") IService cupons, @Qualifier("Estoque") IService estoque,
      @Qualifier("Notificacao") IService notificacoes, RegistradorLog registradorLog) {
    this.trocaRepository = trocaRepository;
    this.pedidoRepository = pedidoRepository;
    this.statusPedidoRepository = statusPedidoRepository;
    this.cupomRepository = cupomRepository;
    this.cupons = cupons;
    this.estoque = estoque;
    this.notificacoes = notificacoes;
    this.registradorLog = registradorLog;
  }

  /**
   * RF0041, RN0041 e RN0043: o pedido de troca nasce EM TROCA. Na compra inteira, a
   * compra também passa a EM TROCA.
   */
  @Override
  @Transactional
  public Resultado salvar(EntidadeDominio entidade) {
    Troca entrada = (Troca) entidade;
    Pedido pedido = entrada.getPedidoId() == null ? null
        : pedidoRepository.findById(entrada.getPedidoId()).orElse(null);
    if (pedido == null) {
      return Resultado.erro("Pedido não encontrado.");
    }
    List<String> erros = new ArrayList<>();
    if (entrada.getClienteId() != null && !entrada.getClienteId().equals(pedido.getClienteId())) {
      erros.add("A compra não é do cliente.");
    }
    String statusDaCompra = pedido.getStatus().getDescricao();
    if (!StatusPedido.ENTREGUE.equals(statusDaCompra)) {
      erros.add("RN0043: só compras ENTREGUE podem ter itens trocados; esta está "
          + statusDaCompra + ".");
    }
    if (entrada.getMotivo() == null || entrada.getMotivo().isBlank()) {
      erros.add("Informe o motivo da troca.");
    }
    boolean compraInteira = Boolean.TRUE.equals(entrada.getCompraInteira());
    List<TrocaItem> itens = compraInteira ? itensDaCompraInteira(pedido, erros)
        : itensEscolhidos(entrada, pedido, erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }

    Troca troca = new Troca();
    troca.setPedido(pedido);
    troca.setPedidoId(pedido.getId());
    troca.setStatus(status(StatusPedido.EM_TROCA));
    troca.setCompraInteira(compraInteira);
    troca.setMotivo(entrada.getMotivo().trim());
    itens.forEach(item -> item.setTroca(troca));
    troca.getItens().addAll(itens);
    trocaRepository.save(troca);
    troca.setClienteId(pedido.getClienteId());

    String usuario = pedido.getCliente().getEmail();
    if (compraInteira) {
      mudarStatusDaCompra(pedido, StatusPedido.EM_TROCA, usuario);
    }
    registrar(OperacaoLog.INSERIR, troca, usuario);
    return Resultado.com(troca);
  }

  /**
   * RF0042: EM TROCA vira TROCA AUTORIZADA, com notificação (RN0046). RF0044 e RN0042:
   * TROCA AUTORIZADA vira TROCADO, com o cupom (RF0045) e, se o administrador disser que
   * os itens voltam, a reentrada em estoque (RF0054).
   */
  @Override
  @Transactional
  public Resultado alterar(EntidadeDominio entidade) {
    Troca entrada = (Troca) entidade;
    Troca troca = entrada.getId() == null ? null
        : trocaRepository.findById(entrada.getId()).orElse(null);
    if (troca == null) {
      return Resultado.erro("Troca não encontrada.");
    }
    String atual = troca.getStatus().getDescricao();
    String destino = entrada.getStatus() == null ? null : entrada.getStatus().getDescricao();
    if (StatusPedido.EM_TROCA.equals(atual) && StatusPedido.TROCA_AUTORIZADA.equals(destino)) {
      autorizar(troca);
    } else if (StatusPedido.TROCA_AUTORIZADA.equals(atual)
        && StatusPedido.TROCADO.equals(destino)) {
      if (entrada.getRetornoEstoque() == null) {
        return Resultado.erro("RF0044: informe se os itens trocados voltam ao estoque.");
      }
      receber(troca, entrada.getRetornoEstoque());
    } else {
      return Resultado.erro(recusaDoAvanco(atual, destino));
    }
    preencher(List.of(troca));
    return Resultado.com(troca);
  }

  /** RF0043: os pedidos de troca, filtrados por status, cliente ou compra. */
  @Override
  @Transactional(readOnly = true)
  public Resultado consultar(EntidadeDominio entidade) {
    if (entidade instanceof TrocaFiltro filtro) {
      // poucas trocas: filtrar aqui mantém a consulta do repositório sem parâmetro opcional
      List<Troca> trocas = trocaRepository.findAllByOrderByIdDesc();
      preencher(trocas);
      return Resultado.de(trocas.stream()
          .filter(troca -> vazio(filtro.getStatus())
              || filtro.getStatus().equals(troca.getStatus().getDescricao()))
          .filter(troca -> filtro.getClienteId() == null
              || filtro.getClienteId().equals(troca.getClienteId()))
          .filter(troca -> filtro.getPedidoId() == null
              || filtro.getPedidoId().equals(troca.getPedidoId()))
          .toList());
    }
    Troca troca = (Troca) entidade;
    Troca encontrada =
        troca.getId() == null ? null : trocaRepository.findById(troca.getId()).orElse(null);
    if (encontrada == null) {
      return Resultado.erro("Troca não encontrada.");
    }
    preencher(List.of(encontrada));
    return Resultado.com(encontrada);
  }

  @Override
  public Resultado excluir(EntidadeDominio entidade) {
    return Resultado.erro("A troca não é recusada nem excluída: o DRS só prevê a autorização.");
  }

  private void autorizar(Troca troca) {
    Pedido pedido = troca.getPedido();
    troca.setStatus(status(StatusPedido.TROCA_AUTORIZADA));
    troca.setDataAutorizacao(LocalDateTime.now());
    if (Boolean.TRUE.equals(troca.getCompraInteira())) {
      mudarStatusDaCompra(pedido, StatusPedido.TROCA_AUTORIZADA, RegistradorLog.CURADORIA);
    }

    Notificacao aviso = new Notificacao();
    aviso.setClienteId(pedido.getClienteId());
    aviso.setPedidoId(pedido.getId());
    aviso.setMensagem("Sua troca no pedido #" + pedido.getId() + " foi autorizada. Envie os "
        + "itens para a 33rpm: o cupom de troca é gerado quando eles chegarem.");
    exigir(notificacoes.salvar(aviso));
    registrar(OperacaoLog.ALTERAR, troca, RegistradorLog.CURADORIA);
  }

  private void receber(Troca troca, boolean retornoEstoque) {
    Pedido pedido = troca.getPedido();
    troca.setStatus(status(StatusPedido.TROCADO));
    troca.setDataRecebimento(LocalDateTime.now());
    troca.setRetornoEstoque(retornoEstoque);
    if (Boolean.TRUE.equals(troca.getCompraInteira())) {
      mudarStatusDaCompra(pedido, StatusPedido.TROCADO, RegistradorLog.CURADORIA);
    }

    TipoCupom tipoTroca = new TipoCupom();
    tipoTroca.setDesc(TipoCupom.TROCA);
    Cupom cupom = new Cupom();
    cupom.setCliente(pedido.getCliente());
    cupom.setTipo(tipoTroca);
    cupom.setCodigo("TROCA-T%06d".formatted(troca.getId()));
    cupom.setValor(troca.getValor());
    cupom.setTrocaOrigemId(troca.getId());
    exigir(cupons.salvar(cupom));

    if (retornoEstoque) {
      List<ItemPedido> devolvidos = troca.getItens().stream().map(item -> {
        ItemPedido devolvido = new ItemPedido();
        devolvido.setDiscoId(item.getDiscoId());
        devolvido.setQuantidade(item.getQuantidade());
        return devolvido;
      }).toList();
      exigir(estoque.alterar(MovimentoEstoque.de(MovimentoEstoque.REENTRADA, devolvidos,
          "Troca " + troca.getId(), RegistradorLog.CURADORIA)));
    }
    registrar(OperacaoLog.ALTERAR, troca, RegistradorLog.CURADORIA);
  }

  /** RN0041: todos os itens, com a quantidade cheia, desde que nada da compra esteja em troca. */
  private List<TrocaItem> itensDaCompraInteira(Pedido pedido, List<String> erros) {
    if (!trocaRepository.findByPedidoIdInOrderByIdAsc(List.of(pedido.getId())).isEmpty()) {
      erros.add("RN0041: parte desta compra já foi para troca; escolha os itens que faltam.");
      return List.of();
    }
    return pedido.getItens().stream().map(item -> novoItem(item, item.getQuantidade())).toList();
  }

  /** RN0041: cada item escolhido é desta compra e não passa do que ainda não foi trocado. */
  private List<TrocaItem> itensEscolhidos(Troca entrada, Pedido pedido, List<String> erros) {
    if (entrada.getItens() == null || entrada.getItens().isEmpty()) {
      erros.add("RN0041: escolha ao menos um item para trocar.");
      return List.of();
    }
    Map<Long, Integer> jaTrocados = new HashMap<>();
    trocaRepository.findByPedidoIdInOrderByIdAsc(List.of(pedido.getId()))
        .forEach(anterior -> anterior.getItens().forEach(item ->
            jaTrocados.merge(item.getItemPedidoId(), item.getQuantidade(), Integer::sum)));

    List<TrocaItem> itens = new ArrayList<>();
    for (TrocaItem escolhido : entrada.getItens()) {
      ItemPedido item = pedido.getItens().stream()
          .filter(candidato -> candidato.getId().equals(escolhido.getItemPedidoId()))
          .findFirst().orElse(null);
      if (item == null) {
        erros.add("O item " + escolhido.getItemPedidoId() + " não é desta compra.");
        continue;
      }
      if (escolhido.getQuantidade() == null || escolhido.getQuantidade() < 1) {
        erros.add("Informe quantas unidades de " + item.getTitulo() + " trocar.");
        continue;
      }
      int restantes = item.getQuantidade() - jaTrocados.getOrDefault(item.getId(), 0);
      if (escolhido.getQuantidade() > restantes) {
        erros.add("RN0041: só há " + restantes + " unidade(s) de " + item.getTitulo()
            + " para trocar nesta compra.");
        continue;
      }
      jaTrocados.merge(item.getId(), escolhido.getQuantidade(), Integer::sum);
      itens.add(novoItem(item, escolhido.getQuantidade()));
    }
    return itens;
  }

  private static TrocaItem novoItem(ItemPedido item, int quantidade) {
    TrocaItem novo = new TrocaItem();
    novo.setItemPedido(item);
    novo.setItemPedidoId(item.getId());
    novo.setQuantidade(quantidade);
    return novo;
  }

  /** RN0041 e RN0042: na troca da compra inteira, a compra acompanha o status da troca. */
  private void mudarStatusDaCompra(Pedido pedido, String destino, String usuario) {
    String anterior = pedido.getStatus().getDescricao();
    pedido.setStatus(status(destino));
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("statusAnterior", anterior);
    dados.put("status", destino);
    registradorLog.registrar(OperacaoLog.ALTERAR, Pedido.class.getSimpleName(), pedido.getId(),
        dados, usuario);
  }

  private static String recusaDoAvanco(String atual, String destino) {
    if (StatusPedido.TROCA_AUTORIZADA.equals(destino)) {
      return "RF0042: só trocas EM TROCA podem ser autorizadas; esta está " + atual + ".";
    }
    if (StatusPedido.TROCADO.equals(destino)) {
      return "RN0042: só trocas autorizadas têm o recebimento confirmado; esta está " + atual
          + ".";
    }
    return "A troca segue de EM TROCA para TROCA AUTORIZADA e depois para TROCADO.";
  }

  /** O dono da compra e o cupom gerado (RF0045), que o JSON da troca mostra. */
  private void preencher(List<Troca> trocas) {
    if (trocas.isEmpty()) {
      return;
    }
    List<Long> ids = trocas.stream().map(Troca::getId).toList();
    Map<Long, Long> clientes = trocaRepository.clientesDas(ids).stream()
        .collect(Collectors.toMap(linha -> (Long) linha[0], linha -> (Long) linha[1]));
    Map<Long, Cupom> cuponsGerados = cupomRepository.findByTrocaOrigemIdIn(ids).stream()
        .collect(Collectors.toMap(Cupom::getTrocaOrigemId, Function.identity()));
    for (Troca troca : trocas) {
      troca.setClienteId(clientes.get(troca.getId()));
      troca.setCupomGerado(cuponsGerados.get(troca.getId()));
    }
  }

  private void registrar(String operacao, Troca troca, String usuario) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("pedidoId", troca.getPedidoId());
    dados.put("status", troca.getStatus().getDescricao());
    dados.put("compraInteira", troca.getCompraInteira());
    dados.put("motivo", troca.getMotivo());
    dados.put("itens", troca.getItens().stream()
        .map(item -> Map.of("itemPedidoId", item.getItemPedidoId(), "quantidade",
            item.getQuantidade()))
        .toList());
    if (troca.getRetornoEstoque() != null) {
      dados.put("retornoEstoque", troca.getRetornoEstoque());
    }
    registradorLog.registrar(operacao, Troca.class.getSimpleName(), troca.getId(), dados,
        usuario);
  }

  private StatusPedido status(String descricao) {
    return statusPedidoRepository.findByDescricao(descricao).orElseThrow(
        () -> new IllegalStateException("Status " + descricao + " ausente. Rode db/seed.sql."));
  }

  /** As escritas internas já foram conferidas; uma recusa aqui é defeito, não regra. */
  private static Resultado exigir(Resultado resultado) {
    if (resultado.temErro()) {
      throw new IllegalStateException(String.join(" ", resultado.getMensagens()));
    }
    return resultado;
  }

  private static boolean vazio(String valor) {
    return valor == null || valor.isBlank();
  }
}
