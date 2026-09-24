package br.com.rpm33.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

import br.com.rpm33.model.Administrador;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.Log;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.repository.LogRepository;
import br.com.rpm33.repository.OperacaoLogRepository;

/** RNF0012: grava data, hora, usuário e dados alterados de cada operação de escrita. */
@Component
public class RegistradorLog {

  // Sem autenticação de operador no escopo da disciplina, toda escrita é da curadoria.
  private static final String USUARIO = "curadoria";

  private final LogRepository logRepository;
  private final OperacaoLogRepository operacaoLogRepository;
  private final ObjectMapper objectMapper;

  public RegistradorLog(LogRepository logRepository, OperacaoLogRepository operacaoLogRepository,
      ObjectMapper objectMapper) {
    this.logRepository = logRepository;
    this.operacaoLogRepository = operacaoLogRepository;
    this.objectMapper = objectMapper;
  }

  public void registrar(String operacao, Cliente cliente) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("codigo", cliente.getCodigo());
    dados.put("nome", cliente.getNome());
    dados.put("email", cliente.getEmail());
    dados.put("cpf", cliente.getCpf());
    dados.put("isAtivo", cliente.getIsAtivo());
    dados.put("enderecos", cliente.getEnderecos().size());
    dados.put("cartoes", cliente.getCartoes().size());
    gravar(operacao, Cliente.class.getSimpleName(), cliente.getId(), dados);
  }

  public void registrar(String operacao, Administrador administrador) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("codigo", administrador.getCodigo());
    dados.put("nome", administrador.getNome());
    dados.put("email", administrador.getEmail());
    dados.put("isAtivo", administrador.getIsAtivo());
    gravar(operacao, Administrador.class.getSimpleName(), administrador.getId(), dados);
  }

  private void gravar(String operacao, String entidade, Long entidadeId, Map<String, Object> dados) {
    Log log = new Log();
    log.setOperacao(operacaoDe(operacao));
    log.setEntidade(entidade);
    log.setEntidadeId(entidadeId);
    log.setUsuario(USUARIO);
    log.setDadosAlterados(objectMapper.writeValueAsString(dados));
    logRepository.save(log);
  }

  private OperacaoLog operacaoDe(String descricao) {
    return operacaoLogRepository.findByDescricao(descricao)
        .orElseThrow(() -> new IllegalStateException(
            "Operação de log '" + descricao + "' ausente. Rode db/seed.sql."));
  }
}
