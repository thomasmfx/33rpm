package br.com.rpm33.service;

import java.util.List;

import br.com.rpm33.model.MensagemAssistente.Turno;

/**
 * RNF0044: a IA generativa do assistente. GeminiVertex fala com o Gemini no Vertex AI;
 * sem projeto configurado, ModeloSimulado responde sem IA, para os testes e para quem
 * roda o projeto sem conta no Google Cloud.
 */
public interface ModeloGenerativo {

  /** Como o chat e a curadoria apresentam o modelo. */
  String descricao();

  String modeloBase();

  /** Com modeloAjustado nulo, responde o modelo base. Falha com IaIndisponivelException. */
  String gerar(String modeloAjustado, String instrucao, List<Turno> conversa);

  /** Grava o dataset onde o ajuste fino lê e devolve o endereço dele. */
  String publicarDataset(String nome, String jsonl);

  /** Cria o job de ajuste fino e devolve o identificador dele. */
  String iniciarAjuste(String datasetUri, String nome);

  SituacaoAjuste consultarAjuste(String job);

  /** status é um dos de Treinamento; modeloAjustado só vem no CONCLUIDO, erro só no FALHOU. */
  record SituacaoAjuste(String status, String modeloAjustado, String erro) {
  }
}
