package br.com.rpm33.controller;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.SituacaoAssistente;
import br.com.rpm33.model.Treinamento;
import br.com.rpm33.service.TreinamentoService;

/** RNF0044 item 3: o ajuste fino do modelo com as vendas e o feedback, pela curadoria. */
@RestController
@RequestMapping("/api/assistente")
public class TreinamentoController {

  private static final MediaType JSONL = MediaType.parseMediaType("application/jsonl");

  private final TreinamentoService treinamentoService;

  public TreinamentoController(TreinamentoService treinamentoService) {
    this.treinamentoService = treinamentoService;
  }

  @GetMapping("/situacao")
  public SituacaoAssistente situacao() {
    return treinamentoService.situacao();
  }

  @GetMapping("/treinamentos")
  public List<Treinamento> listar() {
    return treinamentoService.listar();
  }

  @PostMapping("/treinamentos")
  @ResponseStatus(HttpStatus.CREATED)
  public Treinamento iniciar() {
    return treinamentoService.iniciar();
  }

  /** Consulta agora os treinos em andamento, sem esperar a rotina. */
  @PostMapping("/treinamentos/acompanhamento")
  public List<Treinamento> acompanhar() {
    return treinamentoService.acompanhar();
  }

  /** O JSONL enviado ao Vertex AI naquele treino. */
  @GetMapping("/treinamentos/{id}/dataset")
  public ResponseEntity<String> dataset(@PathVariable Long id) {
    return treinamentoService.buscar(id)
        .map(treino -> arquivo("treino-" + id + ".jsonl", treino.getDataset()))
        .orElse(ResponseEntity.notFound().build());
  }

  /** O JSONL que o próximo treino enviaria, montado agora. */
  @GetMapping("/dataset")
  public ResponseEntity<String> previaDoDataset() {
    return arquivo("dataset-atual.jsonl", treinamentoService.previaDoDataset());
  }

  private static ResponseEntity<String> arquivo(String nome, String conteudo) {
    return ResponseEntity.ok().contentType(JSONL)
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nome + "\"")
        .body(conteudo);
  }
}
