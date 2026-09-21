package br.com.rpm33.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

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

    Log log = new Log();
    log.setOperacao(operacaoDe(operacao));
    log.setEntidade(Cliente.class.getSimpleName());
    log.setEntidadeId(cliente.getId());
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
