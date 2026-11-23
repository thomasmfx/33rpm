package br.com.rpm33.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import br.com.rpm33.model.Categoria;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.Disco;
import br.com.rpm33.model.InteracaoAssistente;
import br.com.rpm33.model.ItemPedido;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.model.Pedido;
import br.com.rpm33.model.SituacaoAssistente;
import br.com.rpm33.model.SugestaoAssistente;
import br.com.rpm33.model.Treinamento;
import br.com.rpm33.repository.DiscoRepository;
import br.com.rpm33.repository.InteracaoAssistenteRepository;
import br.com.rpm33.repository.PedidoRepository;
import br.com.rpm33.repository.TreinamentoRepository;
import br.com.rpm33.service.ContextoAssistente.RespostaIa;
import br.com.rpm33.service.ContextoAssistente.SugestaoIa;

/**
 * RNF0044 item 3: o ajuste fino do modelo com os dados de vendas e o feedback do chat.
 *
 * Cada treino parte do modelo base com o dataset inteiro, montado na hora a partir do banco:
 * - vendas: para cada compra de um cliente a partir da segunda, o perfil com as compras
 *   anteriores pede uma recomendação, e a resposta esperada são até três discos que ele de
 *   fato comprou nas compras seguintes. O modelo aprende o que os clientes levam depois do
 *   que já têm;
 * - acervo: junto com cada venda, uma dúvida, busca ou pergunta fora do tema com o mesmo
 *   perfil e acervo (PerguntasDoAcervo), para o modelo não esquecer as outras tarefas;
 * - feedback: a pergunta e a resposta avaliada como útil, com o perfil que a IA viu. As
 *   avaliadas como não úteis ficam fora, para o treino não reforçar o erro.
 *
 * Novas vendas e avaliações entram no próximo treino, que só a curadoria dispara: cada job
 * tem custo no Google, e a decisão de pagar por ele fica com quem administra a loja.
 */
@Service
public class TreinamentoService {

  private static final Logger LOG = LoggerFactory.getLogger(TreinamentoService.class);

  static final List<String> PERGUNTAS = List.of(
      "Me recomenda uns discos?",
      "O que você acha que eu iria curtir agora?",
      "Quero algo novo pra coleção. Alguma sugestão?",
      "Com base no que eu já comprei, o que eu deveria ouvir?",
      "Tô procurando o próximo disco pra levar. Alguma ideia?",
      "Me surpreende com umas recomendações.",
      "Que discos combinam com o meu gosto?",
      "Indica alguma coisa pra eu ouvir no fim de semana?");

  /** O acervo de cada exemplo: os discos esperados e outros sorteados até este total. */
  private static final int DISCOS_POR_EXEMPLO = 18;
  private static final int SUGESTOES_POR_EXEMPLO = 3;
  private static final DateTimeFormatter CARIMBO = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

  private final TreinamentoRepository treinamentoRepository;
  private final PedidoRepository pedidoRepository;
  private final DiscoRepository discoRepository;
  private final InteracaoAssistenteRepository interacaoRepository;
  private final ContextoAssistente contexto;
  private final ModeloGenerativo modelo;
  private final RegistradorLog registradorLog;
  private final ObjectMapper objectMapper;
  private final int minimoExemplos;

  public TreinamentoService(TreinamentoRepository treinamentoRepository,
      PedidoRepository pedidoRepository, DiscoRepository discoRepository,
      InteracaoAssistenteRepository interacaoRepository, ContextoAssistente contexto,
      ModeloGenerativo modelo, RegistradorLog registradorLog, ObjectMapper objectMapper,
      @Value("${app.ia.treinamento.minimo-exemplos}") int minimoExemplos) {
    this.treinamentoRepository = treinamentoRepository;
    this.pedidoRepository = pedidoRepository;
    this.discoRepository = discoRepository;
    this.interacaoRepository = interacaoRepository;
    this.contexto = contexto;
    this.modelo = modelo;
    this.registradorLog = registradorLog;
    this.objectMapper = objectMapper;
    this.minimoExemplos = minimoExemplos;
  }

  /**
   * O treino concluído mais recente do modelo configurado. Treino de outro modelo base (do
   * modo simulado, por exemplo) não vale para este.
   */
  @Transactional(readOnly = true)
  public Optional<Treinamento> modeloAtivo() {
    return treinamentoRepository.findFirstByStatusAndModeloBaseOrderByDataConclusaoDescIdDesc(
        Treinamento.CONCLUIDO, modelo.modeloBase());
  }

  @Transactional(readOnly = true)
  public List<Treinamento> listar() {
    return treinamentoRepository.findAllByOrderByIdDesc();
  }

  @Transactional(readOnly = true)
  public Optional<Treinamento> buscar(Long id) {
    return treinamentoRepository.findById(id);
  }

  /** O que a curadoria vê antes de treinar: o modelo em uso e os exemplos disponíveis. */
  @Transactional(readOnly = true)
  public SituacaoAssistente situacao() {
    Dataset dataset = montarDataset();
    return new SituacaoAssistente(modelo.descricao(), modelo.modeloBase(),
        modeloAtivo().orElse(null),
        !treinamentoRepository.findByStatus(Treinamento.EM_TREINAMENTO).isEmpty(),
        dataset.exemplosVendas(), dataset.exemplosFeedback(), dataset.exemplosAcervo(),
        dataset.feedbacksDescartados(), novosDesdeOUltimoTreino(dataset), minimoExemplos);
  }

  /** O dataset que o próximo treino enviaria, sem treinar. */
  @Transactional(readOnly = true)
  public String previaDoDataset() {
    return montarDataset().jsonl();
  }

  /** Treino pedido pela curadoria. */
  @Transactional
  public Treinamento iniciar() {
    return iniciar(RegistradorLog.CURADORIA);
  }

  /** Consulta agora os treinos em andamento, sem esperar a rotina. */
  @Transactional
  public List<Treinamento> acompanhar() {
    atualizarEmAndamento(RegistradorLog.CURADORIA);
    return treinamentoRepository.findAllByOrderByIdDesc();
  }

  @Scheduled(fixedDelayString = "${app.ia.treinamento.intervalo-acompanhamento}")
  @Transactional
  public void acompanharNaRotina() {
    atualizarEmAndamento(RegistradorLog.ROTINA_AUTOMATICA);
  }

  private Treinamento iniciar(String usuario) {
    if (!treinamentoRepository.findByStatus(Treinamento.EM_TREINAMENTO).isEmpty()) {
      throw new RegraNegocioException("Já há um treino em andamento. Aguarde a conclusão.");
    }
    Dataset dataset = montarDataset();
    if (dataset.total() < minimoExemplos) {
      throw new RegraNegocioException("O treino precisa de pelo menos " + minimoExemplos
          + " exemplos; há " + dataset.total() + " entre vendas e feedback útil.");
    }

    Treinamento treino = new Treinamento();
    treino.setModeloBase(modelo.modeloBase());
    treino.setDataset(dataset.jsonl());
    treino.setExemplosVendas(dataset.exemplosVendas());
    treino.setExemplosFeedback(dataset.exemplosFeedback());
    treino.setExemplosAcervo(dataset.exemplosAcervo());
    treino.setFeedbacksDescartados(dataset.feedbacksDescartados());
    String nome = "33rpm-" + LocalDateTime.now().format(CARIMBO);
    try {
      treino.setDatasetUri(modelo.publicarDataset("treinos/" + nome + ".jsonl", dataset.jsonl()));
      treino.setJob(modelo.iniciarAjuste(treino.getDatasetUri(), nome));
      treino.setStatus(Treinamento.EM_TREINAMENTO);
    } catch (IaIndisponivelException e) {
      // o treino que não começou fica registrado com o motivo, para a curadoria ver
      LOG.warn("Treino {} não começou: {}", nome, e.getMessage());
      treino.setStatus(Treinamento.FALHOU);
      treino.setErro(e.getMessage());
      treino.setDataConclusao(LocalDateTime.now());
    }
    Treinamento salvo = treinamentoRepository.save(treino);
    registrarLog(OperacaoLog.INSERIR, salvo, usuario);
    return salvo;
  }

  private void atualizarEmAndamento(String usuario) {
    for (Treinamento treino : treinamentoRepository.findByStatus(Treinamento.EM_TREINAMENTO)) {
      ModeloGenerativo.SituacaoAjuste situacao;
      try {
        situacao = modelo.consultarAjuste(treino.getJob());
      } catch (IaIndisponivelException e) {
        LOG.warn("Não foi possível consultar o treino {}: {}", treino.getId(), e.getMessage());
        continue;
      }
      if (!Treinamento.EM_TREINAMENTO.equals(situacao.status())) {
        treino.setStatus(situacao.status());
        treino.setModeloAjustado(situacao.modeloAjustado());
        treino.setErro(situacao.erro());
        treino.setDataConclusao(LocalDateTime.now());
        registrarLog(OperacaoLog.ALTERAR, treino, usuario);
      }
    }
  }

  private int novosDesdeOUltimoTreino(Dataset dataset) {
    return treinamentoRepository.findAllByOrderByIdDesc().stream()
        .filter(treino -> !Treinamento.FALHOU.equals(treino.getStatus())
            && modelo.modeloBase().equals(treino.getModeloBase()))
        .findFirst()
        .map(ultimo -> Math.max(0,
            dataset.total() - ultimo.getExemplosVendas() - ultimo.getExemplosFeedback()))
        .orElse(dataset.total());
  }

  private void registrarLog(String operacao, Treinamento treino, String usuario) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("status", treino.getStatus());
    dados.put("modeloBase", treino.getModeloBase());
    dados.put("job", treino.getJob());
    dados.put("modeloAjustado", treino.getModeloAjustado());
    dados.put("exemplosVendas", treino.getExemplosVendas());
    dados.put("exemplosFeedback", treino.getExemplosFeedback());
    dados.put("exemplosAcervo", treino.getExemplosAcervo());
    registradorLog.registrar(operacao, Treinamento.class.getSimpleName(), treino.getId(), dados,
        usuario);
  }

  // ------------------------------------------------------------------
  // Dataset
  // ------------------------------------------------------------------

  /** JSONL no formato de ajuste fino supervisionado do Gemini, um exemplo por linha. */
  private Dataset montarDataset() {
    List<Disco> catalogo = discoRepository.findAll().stream()
        .filter(disco -> Boolean.TRUE.equals(disco.getIsAtivo()))
        .sorted(Comparator.comparing(Disco::getId)).toList();
    Map<Long, Disco> porId = catalogo.stream()
        .collect(Collectors.toMap(Disco::getId, Function.identity()));

    Map<Long, List<Pedido>> comprasPorCliente = new TreeMap<>();
    for (Pedido pedido : pedidoRepository.findAll()) {
      if (ContextoAssistente.eCompra(pedido)) {
        comprasPorCliente.computeIfAbsent(pedido.getClienteId(), id -> new ArrayList<>())
            .add(pedido);
      }
    }
    Map<Long, Set<Long>> discosPorCliente = new HashMap<>();
    comprasPorCliente.forEach((clienteId, compras) -> discosPorCliente.put(clienteId,
        compras.stream().flatMap(pedido -> pedido.getItens().stream())
            .map(ItemPedido::getDiscoId).collect(Collectors.toSet())));

    List<String> linhas = new ArrayList<>();
    int vendas = 0;
    int doAcervo = 0;
    for (Map.Entry<Long, List<Pedido>> entrada : comprasPorCliente.entrySet()) {
      List<Pedido> compras = new ArrayList<>(entrada.getValue());
      compras.sort(Comparator.comparing(Pedido::getDataCadastro).thenComparing(Pedido::getId));
      Cliente cliente = compras.get(0).getCliente();
      String nome = cliente.getNome().trim().split("\\s+")[0];
      for (int k = 1; k < compras.size(); k++) {
        List<Pedido> anteriores = new ArrayList<>(compras.subList(0, k));
        anteriores.sort(Comparator.comparing(Pedido::getDataCadastro).reversed()
            .thenComparing(Pedido::getId, Comparator.reverseOrder()));
        Set<Long> jaComprados = anteriores.stream().flatMap(pedido -> pedido.getItens().stream())
            .map(ItemPedido::getDiscoId).collect(Collectors.toSet());
        // as próximas compras, e não só a seguinte: um pedido costuma ter um disco, e a
        // recomendação da conversa traz até três
        List<Disco> esperados = compras.subList(k, compras.size()).stream()
            .flatMap(pedido -> pedido.getItens().stream()).map(ItemPedido::getDiscoId)
            .distinct().filter(id -> !jaComprados.contains(id) && porId.containsKey(id))
            .limit(SUGESTOES_POR_EXEMPLO).map(porId::get).toList();
        if (esperados.isEmpty()) {
          continue;
        }

        Random sorteio = new Random(compras.get(k).getId());
        ContextoAssistente.Gosto gosto = contexto.gosto(cliente, anteriores);
        // na ordem do texto: primeiro os discos do gosto, depois as descobertas
        esperados = Stream.concat(esperados.stream().filter(gosto::temAfinidade),
            esperados.stream().filter(disco -> !gosto.temAfinidade(disco))).toList();
        List<SugestaoIa> sugestoes = esperados.stream()
            .map(disco -> new SugestaoIa(disco.getId(), motivoDaVenda(disco, anteriores, gosto,
                cliente, discosPorCliente, entrada.getKey())))
            .toList();
        RespostaIa resposta = new RespostaIa(
            textoDaRecomendacao(nome, esperados, gosto, sorteio), sugestoes);
        String perfil = contexto.perfil(cliente, anteriores);
        List<Disco> acervo = acervoDoExemplo(esperados, catalogo, sorteio);
        linhas.add(exemplo(perfil, acervo, PERGUNTAS.get(sorteio.nextInt(PERGUNTAS.size())),
            resposta));
        vendas++;

        PerguntasDoAcervo.Exemplo outraTarefa = PerguntasDoAcervo.gerar(vendas, nome, acervo,
            catalogo, jaComprados, sorteio);
        linhas.add(exemplo(perfil, acervo, outraTarefa.pergunta(), outraTarefa.resposta()));
        doAcervo++;
      }
    }

    int feedback = 0;
    int descartados = 0;
    for (InteracaoAssistente interacao : interacaoRepository.findByIsUtilNotNullOrderByIdAsc()) {
      if (Boolean.FALSE.equals(interacao.getIsUtil())) {
        descartados++;
        continue;
      }
      List<Disco> sugeridos = interacao.getSugestoes().stream().map(SugestaoAssistente::getDisco)
          .toList();
      RespostaIa resposta = new RespostaIa(interacao.getResposta(), interacao.getSugestoes()
          .stream().map(s -> new SugestaoIa(s.getDisco().getId(), s.getMotivo())).toList());
      linhas.add(exemplo(interacao.getContextoCliente(),
          acervoDoExemplo(sugeridos, catalogo, new Random(interacao.getId())),
          interacao.getPergunta(), resposta));
      feedback++;
    }

    return new Dataset(linhas.isEmpty() ? "" : String.join("\n", linhas) + "\n", vendas,
        doAcervo, feedback, descartados);
  }

  private String exemplo(String perfil, List<Disco> acervo, String pergunta,
      RespostaIa resposta) {
    ObjectNode linha = objectMapper.createObjectNode();
    linha.putObject("systemInstruction").putArray("parts").addObject()
        .put("text", contexto.instrucao(perfil, acervo));
    ArrayNode conteudos = linha.putArray("contents");
    ObjectNode usuario = conteudos.addObject();
    usuario.put("role", "user");
    usuario.putArray("parts").addObject().put("text", pergunta);
    ObjectNode respostaDoModelo = conteudos.addObject();
    respostaDoModelo.put("role", "model");
    respostaDoModelo.putArray("parts").addObject().put("text", contexto.serializar(resposta));
    return linha.toString();
  }

  /** Os discos da resposta no meio de outros sorteados, em ordem de id, como na conversa. */
  private static List<Disco> acervoDoExemplo(List<Disco> esperados, List<Disco> catalogo,
      Random sorteio) {
    Set<Disco> escolhidos = new LinkedHashSet<>(esperados);
    List<Disco> restantes = new ArrayList<>(catalogo);
    restantes.removeAll(escolhidos);
    while (escolhidos.size() < DISCOS_POR_EXEMPLO && !restantes.isEmpty()) {
      escolhidos.add(restantes.remove(sorteio.nextInt(restantes.size())));
    }
    return escolhidos.stream().sorted(Comparator.comparing(Disco::getId)).toList();
  }

  /**
   * O que liga o disco comprado ao cliente. No gosto de costume: um estilo de uma compra
   * anterior, uma preferência declarada ou o gênero. Fora dele, é descoberta, e o motivo
   * é o disco do cliente que mais clientes levaram junto com este.
   */
  private static String motivoDaVenda(Disco disco, List<Pedido> anteriores,
      ContextoAssistente.Gosto gosto, Cliente cliente, Map<Long, Set<Long>> discosPorCliente,
      Long clienteId) {
    List<Disco> historico = anteriores.stream().flatMap(pedido -> pedido.getItens().stream())
        .map(ItemPedido::getDisco).distinct().toList();
    if (gosto.temAfinidade(disco)) {
      Optional<String> porEstilo = emComum(disco, historico, Categoria.ESTILO)
          .map(par -> "Tem o " + par.categoria().getDesc() + " de " + par.disco().getTitulo()
              + ", que você levou");
      Optional<String> porPreferencia = disco.getCategorias().stream()
          .filter(cliente.getPreferencias()::contains).findFirst()
          .map(categoria -> "É " + categoria.getDesc() + ", um dos seus preferidos");
      Optional<String> porGenero = emComum(disco, historico, Categoria.GENERO)
          .map(par -> "Do mesmo gênero de " + par.disco().getTitulo() + " ("
              + par.categoria().getDesc() + "), que você levou");
      return porEstilo.or(() -> porPreferencia).or(() -> porGenero)
          .orElse("Combina com o que você costuma ouvir");
    }

    Disco maisLevadoJunto = null;
    long maiorContagem = 0;
    for (Disco anterior : historico) {
      long contagem = discosPorCliente.entrySet().stream()
          .filter(e -> !e.getKey().equals(clienteId) && e.getValue().contains(anterior.getId())
              && e.getValue().contains(disco.getId()))
          .count();
      if (contagem > maiorContagem) {
        maiorContagem = contagem;
        maisLevadoJunto = anterior;
      }
    }
    return maisLevadoJunto != null
        ? "Descoberta: quem levou " + maisLevadoJunto.getTitulo() + " também levou este"
        : "Descoberta: um dos discos que mais saem na loja";
  }

  /** A compra mais recente que divide com o disco uma categoria do tipo dado. */
  private static Optional<CategoriaEmComum> emComum(Disco disco, List<Disco> historico,
      String tipo) {
    for (Disco anterior : historico) {
      Optional<Categoria> categoria = disco.getCategorias().stream()
          .filter(c -> tipo.equals(c.getTipo()) && anterior.getCategorias().contains(c))
          .findFirst();
      if (categoria.isPresent()) {
        return Optional.of(new CategoriaEmComum(categoria.get(), anterior));
      }
    }
    return Optional.empty();
  }

  private record CategoriaEmComum(Categoria categoria, Disco disco) {
  }

  /**
   * O texto da recomendação, com o nome do cliente e os discos. As frases variam de exemplo a
   * exemplo: com um molde só, o modelo ajustado passou a repetir o molde para toda pergunta.
   */
  private static String textoDaRecomendacao(String nome, List<Disco> discos,
      ContextoAssistente.Gosto gosto, Random sorteio) {
    List<Disco> afinidade = discos.stream().filter(gosto::temAfinidade).toList();
    List<Disco> descobertas = discos.stream().filter(disco -> !gosto.temAfinidade(disco))
        .toList();
    StringBuilder texto = new StringBuilder();
    if (!afinidade.isEmpty()) {
      String lista = PerguntasDoAcervo.listar(afinidade);
      boolean varios = afinidade.size() > 1;
      texto.append(switch (sorteio.nextInt(4)) {
        case 0 -> nome + ", pelo que você já levou, " + lista
            + (varios ? " combinam" : " combina") + " com você.";
        case 1 -> "Oi, " + nome + "! Separei " + lista + (varios ? ", que têm" : ", que tem")
            + " tudo a ver com o seu gosto.";
        case 2 -> nome + ", acho que você vai curtir " + lista + ".";
        default -> "Boa pedida pra você, " + nome + ": " + lista + ".";
      });
    }
    if (!descobertas.isEmpty()) {
      String lista = PerguntasDoAcervo.listar(descobertas);
      boolean varias = descobertas.size() > 1;
      if (texto.isEmpty()) {
        texto.append(nome).append(", que tal sair um pouco do de sempre? ").append(lista)
            .append(varias ? " são descobertas" : " é uma descoberta")
            .append(" que clientes com gosto parecido levaram.");
      } else {
        texto.append(' ').append(switch (sorteio.nextInt(3)) {
          case 0 -> "E de descoberta, fora do que você costuma ouvir: " + lista + ".";
          case 1 -> "Pra variar, " + (varias ? "vão duas descobertas: " : "vai uma descoberta: ")
              + lista + ".";
          default -> "Também incluí " + lista + (varias ? ", descobertas" : ", uma descoberta")
              + " de quem tem gosto parecido com o seu.";
        });
      }
    }
    return texto.toString();
  }

  /** O mínimo para treinar conta só vendas e feedback; o acervo acompanha as vendas. */
  record Dataset(String jsonl, int exemplosVendas, int exemplosAcervo, int exemplosFeedback,
      int feedbacksDescartados) {

    int total() {
      return exemplosVendas + exemplosFeedback;
    }
  }
}
