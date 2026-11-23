package br.com.rpm33.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.Disco;
import br.com.rpm33.model.InteracaoAssistente;
import br.com.rpm33.model.MensagemAssistente;
import br.com.rpm33.model.MensagemAssistente.Turno;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.model.Pedido;
import br.com.rpm33.model.SugestaoAssistente;
import br.com.rpm33.model.Treinamento;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.DiscoRepository;
import br.com.rpm33.repository.InteracaoAssistenteRepository;
import br.com.rpm33.service.ContextoAssistente.RespostaIa;
import br.com.rpm33.service.ContextoAssistente.SugestaoIa;

/**
 * RNF0044: o chat de recomendação do cliente. Cada pergunta vai à IA com o perfil do
 * cliente (compras e preferências) e o acervo disponível; a resposta é gravada com as
 * sugestões, para o cliente avaliar como útil ou não útil e o treino aproveitar.
 */
@Service
public class AssistenteService {

  public static final int TAMANHO_MAXIMO_MENSAGEM = 500;
  private static final int TURNOS_ANTERIORES = 6;
  // a resposta anterior do assistente volta em JSON, com os motivos de até três sugestões
  private static final int TAMANHO_MAXIMO_TURNO = 2000;
  private static final int SUGESTOES_POR_RESPOSTA = 3;
  private static final String CLIENTE = "cliente";
  private static final String ASSISTENTE = "assistente";

  private final ClienteRepository clienteRepository;
  private final DiscoRepository discoRepository;
  private final InteracaoAssistenteRepository interacaoRepository;
  private final ContextoAssistente contexto;
  private final ModeloGenerativo modelo;
  private final TreinamentoService treinamentoService;
  private final RegistradorLog registradorLog;

  public AssistenteService(ClienteRepository clienteRepository, DiscoRepository discoRepository,
      InteracaoAssistenteRepository interacaoRepository, ContextoAssistente contexto,
      ModeloGenerativo modelo, TreinamentoService treinamentoService,
      RegistradorLog registradorLog) {
    this.clienteRepository = clienteRepository;
    this.discoRepository = discoRepository;
    this.interacaoRepository = interacaoRepository;
    this.contexto = contexto;
    this.modelo = modelo;
    this.treinamentoService = treinamentoService;
    this.registradorLog = registradorLog;
  }

  /** RNF0044 itens 1 e 2: a pergunta do cliente respondida pela IA, já gravada. */
  @Transactional
  public InteracaoAssistente conversar(MensagemAssistente entrada) {
    List<String> erros = new ArrayList<>();
    Cliente cliente = validarCliente(entrada.getClienteId(), erros);
    String mensagem = entrada.getMensagem() == null ? "" : entrada.getMensagem().strip();
    if (mensagem.isEmpty()) {
      erros.add("Escreva uma mensagem para o assistente.");
    } else if (mensagem.length() > TAMANHO_MAXIMO_MENSAGEM) {
      erros.add("A mensagem pode ter até " + TAMANHO_MAXIMO_MENSAGEM + " caracteres.");
    }
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }

    List<Pedido> compras = contexto.compras(cliente.getId());
    String perfil = contexto.perfil(cliente, compras);
    List<Disco> acervo = discoRepository.findAll().stream()
        .filter(disco -> Boolean.TRUE.equals(disco.getIsAtivo()) && disco.getEstoque() != null
            && disco.getEstoque() > 0)
        .sorted(Comparator.comparing(Disco::getId)).toList();

    Optional<Treinamento> ajustado = treinamentoService.modeloAtivo();
    String bruto = modelo.gerar(ajustado.map(Treinamento::getModeloAjustado).orElse(null),
        contexto.instrucao(perfil, acervo), conversa(entrada.getHistorico(), mensagem));
    String nomeDoModelo = modelo.descricao()
        + ajustado.map(treino -> ", ajustado no treino " + treino.getId()).orElse("");

    return gravar(cliente, mensagem, perfil, contexto.interpretar(bruto), nomeDoModelo,
        acervo, compras);
  }

  /**
   * Carga de demonstração: uma conversa passada, com a resposta que a IA deu, entra pelo
   * mesmo caminho de gravação da conversa ao vivo. respostaJson tem o formato que a IA devolve.
   */
  @Transactional
  public InteracaoAssistente registrarConversaAnterior(Cliente cliente, String pergunta,
      String respostaJson, String nomeDoModelo) {
    List<Pedido> compras = contexto.compras(cliente.getId());
    return gravar(cliente, pergunta, contexto.perfil(cliente, compras),
        contexto.interpretar(respostaJson), nomeDoModelo, discoRepository.findAll(), compras);
  }

  /** RNF0044 item 3: o feedback do cliente sobre uma resposta. Pode mudar de ideia. */
  @Transactional
  public InteracaoAssistente avaliar(Long id, Boolean util) {
    if (util == null) {
      throw new RegraNegocioException("Avalie a resposta como útil ou não útil.");
    }
    InteracaoAssistente interacao = interacaoRepository.findById(id)
        .orElseThrow(() -> new RegraNegocioException("Resposta do assistente não encontrada."));
    interacao.setIsUtil(util);
    interacao.setDataAvaliacao(LocalDateTime.now());

    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("isUtil", util);
    registradorLog.registrar(OperacaoLog.ALTERAR, InteracaoAssistente.class.getSimpleName(),
        interacao.getId(), dados, emailDoCliente(interacao.getClienteId()));
    return interacao;
  }

  /**
   * A curadoria acompanha o feedback: as 100 respostas mais recentes, filtradas por
   * avaliação ("util", "nao-util" ou "pendente").
   */
  @Transactional(readOnly = true)
  public List<InteracaoAssistente> listar(String avaliacao) {
    List<InteracaoAssistente> interacoes = interacaoRepository.findTop100ByOrderByIdDesc().stream()
        .filter(interacao -> avaliacao == null || avaliacao.isBlank()
            || switch (avaliacao) {
              case "util" -> Boolean.TRUE.equals(interacao.getIsUtil());
              case "nao-util" -> Boolean.FALSE.equals(interacao.getIsUtil());
              case "pendente" -> interacao.getIsUtil() == null;
              default -> true;
            })
        .toList();
    Map<Long, String> nomes = clienteRepository.findAllById(
            interacoes.stream().map(InteracaoAssistente::getClienteId).collect(Collectors.toSet()))
        .stream().collect(Collectors.toMap(Cliente::getId, Cliente::getNome));
    interacoes.forEach(interacao -> interacao.setClienteNome(nomes.get(interacao.getClienteId())));
    return interacoes;
  }

  private Cliente validarCliente(Long clienteId, List<String> erros) {
    Cliente cliente = clienteId == null ? null : clienteRepository.findById(clienteId).orElse(null);
    if (cliente == null) {
      erros.add("Entre na sua conta para conversar com o assistente.");
    } else if (Boolean.FALSE.equals(cliente.getIsAtivo())) {
      erros.add("Cadastro inativo. Procure a curadoria.");
    }
    return cliente;
  }

  /**
   * As últimas trocas da conversa e a mensagem nova. O Gemini exige que a conversa comece
   * pelo usuário e alterne os papéis: a saudação do chat sai, e falas seguidas do mesmo
   * autor viram uma só.
   */
  private static List<Turno> conversa(List<Turno> historico, String mensagem) {
    List<Turno> anteriores = (historico == null ? List.<Turno>of() : historico).stream()
        .filter(turno -> turno != null && turno.texto() != null && !turno.texto().isBlank()
            && (CLIENTE.equals(turno.autor()) || ASSISTENTE.equals(turno.autor())))
        .toList();
    anteriores = anteriores.subList(Math.max(0, anteriores.size() - TURNOS_ANTERIORES),
        anteriores.size());

    List<Turno> conversa = new ArrayList<>();
    for (Turno turno : anteriores) {
      acrescentar(conversa, turno.autor(), turno.texto());
    }
    acrescentar(conversa, CLIENTE, mensagem);
    while (!conversa.isEmpty() && ASSISTENTE.equals(conversa.get(0).autor())) {
      conversa.remove(0);
    }
    return conversa;
  }

  private static void acrescentar(List<Turno> conversa, String autor, String texto) {
    String limitado = texto.strip();
    if (limitado.length() > TAMANHO_MAXIMO_TURNO) {
      limitado = limitado.substring(0, TAMANHO_MAXIMO_TURNO);
    }
    if (!conversa.isEmpty() && conversa.get(conversa.size() - 1).autor().equals(autor)) {
      Turno anterior = conversa.remove(conversa.size() - 1);
      limitado = anterior.texto() + "\n" + limitado;
    }
    conversa.add(new Turno(autor, limitado));
  }

  /**
   * Grava a interação com até três sugestões válidas: disco que existe no acervo dado, sem
   * repetir. Afinidade ou descoberta sai do gosto de costume do cliente, não da IA.
   */
  private InteracaoAssistente gravar(Cliente cliente, String pergunta, String perfil,
      RespostaIa resposta, String nomeDoModelo, List<Disco> acervo, List<Pedido> compras) {
    Map<Long, Disco> porId = acervo.stream()
        .collect(Collectors.toMap(Disco::getId, Function.identity()));
    ContextoAssistente.Gosto gosto = contexto.gosto(cliente, compras);

    InteracaoAssistente interacao = new InteracaoAssistente();
    interacao.setClienteId(cliente.getId());
    interacao.setPergunta(pergunta);
    interacao.setResposta(resposta.texto().isBlank()
        ? "Não consegui montar uma resposta agora. Pode reformular a pergunta?"
        : resposta.texto());
    interacao.setContextoCliente(perfil);
    interacao.setModelo(nomeDoModelo);

    Set<Long> usados = new HashSet<>();
    for (SugestaoIa sugerida : resposta.sugestoes()) {
      Disco disco = porId.get(sugerida.discoId());
      if (disco == null || usados.size() == SUGESTOES_POR_RESPOSTA
          || !usados.add(disco.getId())) {
        continue;
      }
      SugestaoAssistente sugestao = new SugestaoAssistente();
      sugestao.setInteracao(interacao);
      sugestao.setDisco(disco);
      sugestao.setMotivo(motivo(sugerida.motivo()));
      sugestao.setTipo(gosto.temAfinidade(disco) ? SugestaoAssistente.AFINIDADE
          : SugestaoAssistente.DESCOBERTA);
      interacao.getSugestoes().add(sugestao);
    }

    InteracaoAssistente salva = interacaoRepository.save(interacao);
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("pergunta", pergunta);
    dados.put("sugestoes", salva.getSugestoes().stream().map(s -> s.getDisco().getId()).toList());
    dados.put("modelo", nomeDoModelo);
    registradorLog.registrar(OperacaoLog.INSERIR, InteracaoAssistente.class.getSimpleName(),
        salva.getId(), dados, cliente.getEmail());
    return salva;
  }

  private static String motivo(String sugerido) {
    String motivo = sugerido == null || sugerido.isBlank() ? "Sugestão do assistente"
        : sugerido.strip();
    return motivo.length() > 300 ? motivo.substring(0, 299) + "…" : motivo;
  }

  private String emailDoCliente(Long clienteId) {
    return clienteRepository.findById(clienteId).map(Cliente::getEmail)
        .orElse(RegistradorLog.CURADORIA);
  }
}
