package br.com.rpm33.service;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.google.auth.oauth2.GoogleCredentials;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import br.com.rpm33.model.MensagemAssistente.Turno;
import br.com.rpm33.model.Treinamento;

/**
 * RNF0044: o Gemini no Vertex AI, por REST. A conversa usa generateContent; o ajuste fino
 * grava o dataset no Cloud Storage e cria um tuningJob, e o modelo ajustado responde por
 * um endpoint próprio. Configuração em app.ia.vertex (backend/.env).
 */
@Component
@ConditionalOnExpression("!'${app.ia.vertex.projeto:}'.isBlank()")
public class GeminiVertex implements ModeloGenerativo {

  private static final Logger LOG = LoggerFactory.getLogger(GeminiVertex.class);
  private static final String ESCOPO = "https://www.googleapis.com/auth/cloud-platform";

  private final String projeto;
  private final String regiao;
  private final String bucket;
  private final String modeloBase;
  private final int epocas;
  private final String nivelRaciocinio;
  private final GoogleCredentials credenciais;
  private final ObjectMapper objectMapper;
  private final RestClient http;

  public GeminiVertex(@Value("${app.ia.vertex.projeto}") String projeto,
      @Value("${app.ia.vertex.regiao}") String regiao,
      @Value("${app.ia.vertex.bucket}") String bucket,
      @Value("${app.ia.vertex.credenciais:}") String caminhoCredenciais,
      @Value("${app.ia.vertex.modelo-base}") String modeloBase,
      @Value("${app.ia.vertex.epocas}") int epocas,
      @Value("${app.ia.vertex.nivel-raciocinio:}") String nivelRaciocinio,
      ObjectMapper objectMapper) {
    this.projeto = projeto;
    this.regiao = regiao;
    this.bucket = bucket;
    this.modeloBase = modeloBase;
    this.epocas = epocas;
    this.nivelRaciocinio = nivelRaciocinio;
    this.objectMapper = objectMapper;
    this.credenciais = carregarCredenciais(caminhoCredenciais);

    SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
    fabrica.setConnectTimeout(Duration.ofSeconds(10));
    fabrica.setReadTimeout(Duration.ofSeconds(90));
    this.http = RestClient.builder().requestFactory(fabrica).build();
  }

  /** Sem caminho, vale a credencial padrão do ambiente (gcloud auth application-default login). */
  private static GoogleCredentials carregarCredenciais(String caminho) {
    try {
      if (caminho == null || caminho.isBlank()) {
        return GoogleCredentials.getApplicationDefault().createScoped(ESCOPO);
      }
      try (InputStream chave = new FileInputStream(caminho)) {
        return GoogleCredentials.fromStream(chave).createScoped(ESCOPO);
      }
    } catch (IOException e) {
      throw new IllegalStateException(
          "Não foi possível ler a credencial do Vertex AI (app.ia.vertex.credenciais = '"
              + caminho + "'). Veja a seção do assistente no README.", e);
    }
  }

  @Override
  public String descricao() {
    return "Gemini (" + modeloBase + ") no Vertex AI";
  }

  @Override
  public String modeloBase() {
    return modeloBase;
  }

  @Override
  public String gerar(String modeloAjustado, String instrucao, List<Turno> conversa) {
    ObjectNode corpo = objectMapper.createObjectNode();
    corpo.putObject("systemInstruction").putArray("parts").addObject().put("text", instrucao);
    ArrayNode conteudos = corpo.putArray("contents");
    for (Turno turno : conversa) {
      ObjectNode conteudo = conteudos.addObject();
      conteudo.put("role", "assistente".equals(turno.autor()) ? "model" : "user");
      conteudo.putArray("parts").addObject().put("text", turno.texto());
    }
    // sem temperature: o Google recomenda manter o padrão no Gemini 3, que abaixo dele pode
    // entrar em repetição
    if (!nivelRaciocinio.isBlank()) {
      corpo.putObject("generationConfig").putObject("thinkingConfig")
          .put("thinkingLevel", nivelRaciocinio);
    }

    String alvo = modeloAjustado != null ? modeloAjustado
        : "projects/" + projeto + "/locations/" + regiao + "/publishers/google/models/" + modeloBase;
    JsonNode resposta = postar(api() + alvo + ":generateContent", corpo.toString(),
        MediaType.APPLICATION_JSON);

    StringBuilder texto = new StringBuilder();
    for (JsonNode parte : resposta.path("candidates").path(0).path("content").path("parts")) {
      if (!parte.path("thought").asBoolean(false)) {
        texto.append(parte.path("text").asString(""));
      }
    }
    if (texto.isEmpty()) {
      String motivo = resposta.path("candidates").path(0).path("finishReason").asString(
          resposta.path("promptFeedback").path("blockReason").asString("sem conteúdo"));
      throw new IaIndisponivelException("A IA não devolveu resposta (" + motivo + ").");
    }
    return texto.toString();
  }

  @Override
  public String publicarDataset(String nome, String jsonl) {
    String url = "https://storage.googleapis.com/upload/storage/v1/b/" + bucket
        + "/o?uploadType=media&name=" + URLEncoder.encode(nome, StandardCharsets.UTF_8);
    postar(url, jsonl, MediaType.parseMediaType("application/jsonl"));
    return "gs://" + bucket + "/" + nome;
  }

  @Override
  public String iniciarAjuste(String datasetUri, String nome) {
    ObjectNode corpo = objectMapper.createObjectNode();
    corpo.put("baseModel", modeloBase);
    corpo.put("tunedModelDisplayName", nome);
    ObjectNode especificacao = corpo.putObject("supervisedTuningSpec");
    especificacao.put("trainingDatasetUri", datasetUri);
    especificacao.putObject("hyperParameters").put("epochCount", epocas);
    JsonNode job = postar(api() + "projects/" + projeto + "/locations/" + regiao + "/tuningJobs",
        corpo.toString(), MediaType.APPLICATION_JSON);
    return job.path("name").asString("");
  }

  @Override
  public SituacaoAjuste consultarAjuste(String job) {
    JsonNode situacao = executar(() -> http.get().uri(api() + job)
        .header("Authorization", "Bearer " + token()).retrieve().body(String.class));
    String estado = situacao.path("state").asString("");
    return switch (estado) {
      case "JOB_STATE_SUCCEEDED" -> new SituacaoAjuste(Treinamento.CONCLUIDO,
          situacao.path("tunedModel").path("endpoint").asString(null), null);
      case "JOB_STATE_FAILED", "JOB_STATE_CANCELLED", "JOB_STATE_EXPIRED" ->
          new SituacaoAjuste(Treinamento.FALHOU, null,
              situacao.path("error").path("message").asString(estado));
      default -> new SituacaoAjuste(Treinamento.EM_TREINAMENTO, null, null);
    };
  }

  private String api() {
    return switch (regiao) {
      case "global" -> "https://aiplatform.googleapis.com/v1/";
      case "us", "eu" -> "https://aiplatform." + regiao + ".rep.googleapis.com/v1/";
      default -> "https://" + regiao + "-aiplatform.googleapis.com/v1/";
    };
  }

  /**
   * O corpo vai em bytes UTF-8: como String, o conversor do Spring usaria ISO-8859-1 para
   * tipos que não são JSON, e o JSONL do dataset perderia acentos. A URL vai como URI pronta:
   * como texto, o RestClient codificaria de novo o %2F do nome do dataset, e o arquivo
   * sairia no bucket como treinos%2F... em vez de treinos/...
   */
  private JsonNode postar(String url, String corpo, MediaType tipo) {
    return executar(() -> http.post().uri(URI.create(url))
        .header("Authorization", "Bearer " + token())
        .contentType(new MediaType(tipo, StandardCharsets.UTF_8))
        .body(corpo.getBytes(StandardCharsets.UTF_8)).retrieve().body(String.class));
  }

  private JsonNode executar(java.util.function.Supplier<String> chamada) {
    try {
      String corpo = chamada.get();
      return objectMapper.readTree(corpo == null ? "{}" : corpo);
    } catch (RestClientResponseException e) {
      LOG.warn("Vertex AI respondeu {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
      throw new IaIndisponivelException("O Vertex AI recusou a chamada (" + e.getStatusCode()
          .value() + "): " + mensagemDoGoogle(e.getResponseBodyAsString()), e);
    } catch (RestClientException e) {
      throw new IaIndisponivelException("Sem resposta do Vertex AI: " + e.getMessage(), e);
    }
  }

  private String mensagemDoGoogle(String corpo) {
    try {
      return objectMapper.readTree(corpo).path("error").path("message").asString(corpo);
    } catch (RuntimeException e) {
      return corpo;
    }
  }

  private synchronized String token() {
    try {
      credenciais.refreshIfExpired();
      return credenciais.getAccessToken().getTokenValue();
    } catch (IOException e) {
      throw new IaIndisponivelException("Não foi possível autenticar no Google Cloud.", e);
    }
  }
}
