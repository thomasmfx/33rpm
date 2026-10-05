package br.com.rpm33.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

import br.com.rpm33.model.Administrador;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.Log;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.repository.LogRepository;
import br.com.rpm33.repository.OperacaoLogRepository;
import jakarta.persistence.EntityManager;

/** RNF0012: grava data, hora, usuário e dados alterados de cada operação de escrita. */
@Component
public class RegistradorLog {

  /**
   * Sem autenticação de operador no escopo da disciplina, a escrita da curadoria não
   * identifica quem a fez. A do cliente leva o e-mail dele.
   */
  public static final String CURADORIA = "curadoria";

  /** RF0013: a inativação automática não tem operador. */
  public static final String ROTINA_AUTOMATICA = "rotina-automatica";

  private final LogRepository logRepository;
  private final OperacaoLogRepository operacaoLogRepository;
  private final ObjectMapper objectMapper;
  private final EntityManager entityManager;

  /** operacao_log é domínio fixo da carga (RNF0013): o id de cada operação não muda. */
  private final Map<String, Long> idsDasOperacoes = new ConcurrentHashMap<>();

  public RegistradorLog(LogRepository logRepository, OperacaoLogRepository operacaoLogRepository,
      ObjectMapper objectMapper, EntityManager entityManager) {
    this.logRepository = logRepository;
    this.operacaoLogRepository = operacaoLogRepository;
    this.objectMapper = objectMapper;
    this.entityManager = entityManager;
  }

  public void registrar(String operacao, Cliente cliente) {
    registrar(operacao, cliente, CURADORIA);
  }

  public void registrar(String operacao, Cliente cliente, String usuario) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("codigo", cliente.getCodigo());
    dados.put("nome", cliente.getNome());
    dados.put("email", cliente.getEmail());
    dados.put("cpf", cliente.getCpf());
    dados.put("isAtivo", cliente.getIsAtivo());
    dados.put("enderecos", cliente.getEnderecos().size());
    dados.put("cartoes", cliente.getCartoes().size());
    registrar(operacao, Cliente.class.getSimpleName(), cliente.getId(), dados, usuario);
  }

  public void registrar(String operacao, Administrador administrador) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("codigo", administrador.getCodigo());
    dados.put("nome", administrador.getNome());
    dados.put("email", administrador.getEmail());
    dados.put("isAtivo", administrador.getIsAtivo());
    registrar(operacao, Administrador.class.getSimpleName(), administrador.getId(), dados,
        CURADORIA);
  }

  public void registrar(String operacao, String entidade, Long entidadeId,
      Map<String, Object> dados, String usuario) {
    Log log = new Log();
    log.setOperacao(operacaoDe(operacao));
    log.setEntidade(entidade);
    log.setEntidadeId(entidadeId);
    log.setUsuario(usuario);
    log.setDadosAlterados(objectMapper.writeValueAsString(dados));
    logRepository.save(log);
  }

  private OperacaoLog operacaoDe(String descricao) {
    Long id = idsDasOperacoes.computeIfAbsent(descricao,
        chave -> operacaoLogRepository.findByDescricao(chave).map(OperacaoLog::getId)
            .orElseThrow(() -> new IllegalStateException(
                "Operação de log '" + chave + "' ausente. Rode db/seed.sql.")));
    return entityManager.getReference(OperacaoLog.class, id);
  }
}
