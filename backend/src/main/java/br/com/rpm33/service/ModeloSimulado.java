package br.com.rpm33.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import br.com.rpm33.model.MensagemAssistente.Turno;
import br.com.rpm33.model.Treinamento;

/**
 * Sem app.ia.vertex.projeto, o assistente responde sem IA, por regra: pergunta que cita um
 * disco do acervo recebe os dados dele; mensagem que cita um artista, discos dele; o resto,
 * os dois discos cujos gêneros e estilos mais aparecem nas compras e preferências do perfil,
 * mais o de menor afinidade, como descoberta. O ajuste fino conclui na primeira consulta.
 * Serve aos testes de interface, que não podem depender de rede nem gerar custo, e o chat
 * avisa que está neste modo.
 */
@Component
@ConditionalOnExpression("'${app.ia.vertex.projeto:}'.isBlank()")
public class ModeloSimulado implements ModeloGenerativo {

  private static final Pattern LINHA_DO_ACERVO =
      Pattern.compile("(?m)^(\\d+) \\| (.+?) \\| (.+?) \\| (.+?) \\| (.*?) \\| ");
  private static final Pattern LINHA_DE_COMPRA =
      Pattern.compile("(?m)^- [^|]+ \\| (.+?) \\| .+? \\| (.*)$");
  private static final Pattern PREFERIDOS =
      Pattern.compile("(?m)^Gêneros e estilos preferidos: (.*)$");
  private static final int PESO_PREFERENCIA = 3;

  private final ObjectMapper objectMapper;

  public ModeloSimulado(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public String descricao() {
    return "Modo simulado, sem IA";
  }

  @Override
  public String modeloBase() {
    return "simulado";
  }

  @Override
  public String gerar(String modeloAjustado, String instrucao, List<Turno> conversa) {
    List<DiscoDoAcervo> acervo = new ArrayList<>();
    Matcher linha = LINHA_DO_ACERVO.matcher(instrucao);
    while (linha.find()) {
      acervo.add(new DiscoDoAcervo(Long.valueOf(linha.group(1)), linha.group(2), linha.group(3),
          linha.group(4), categorias(linha.group(5))));
    }
    String mensagem = conversa.isEmpty() ? ""
        : conversa.get(conversa.size() - 1).texto().toLowerCase(Locale.ROOT);

    if (mensagem.contains("?")) {
      for (DiscoDoAcervo disco : acervo) {
        if (cita(mensagem, disco.titulo())) {
          return resposta(disco.titulo() + " é de " + disco.artista() + ", lançado em "
              + disco.ano() + ". Gêneros e estilos: " + String.join(", ", disco.categorias())
              + ". (Modo simulado, sem IA.)", List.of());
        }
      }
    }

    List<String[]> sugestoes = new ArrayList<>();
    acervo.stream().filter(disco -> cita(mensagem, disco.artista()))
        .limit(3).forEach(disco -> sugestoes.add(new String[] {String.valueOf(disco.id()),
            "É de " + disco.artista() + ", como você pediu"}));

    if (sugestoes.isEmpty()) {
      Map<String, Integer> gosto = gosto(instrucao);
      Set<String> comprados = comprados(instrucao);
      List<DiscoDoAcervo> novos = acervo.stream()
          .filter(disco -> !comprados.contains(disco.titulo()))
          .sorted(Comparator.comparingInt((DiscoDoAcervo disco) -> -afinidade(disco, gosto))
              .thenComparing(DiscoDoAcervo::id))
          .toList();
      novos.stream().limit(2).forEach(disco -> sugestoes.add(new String[] {
          String.valueOf(disco.id()), "Tem " + disco.categorias().stream()
              .max(Comparator.comparingInt(c -> gosto.getOrDefault(c, 0))).orElse("")
              + ", como as suas compras e preferências"}));
      if (novos.size() > 2) {
        sugestoes.add(new String[] {String.valueOf(novos.get(novos.size() - 1).id()),
            "Descoberta: fora do que você costuma levar"});
      }
    }

    return resposta("Modo simulado, sem IA: escolhi pelas suas compras e preferências. "
        + "Configure o Vertex AI para receber respostas da IA generativa.", sugestoes);
  }

  /** Palavra inteira: o disco "AM" não pode casar com "combinam". */
  private static boolean cita(String mensagem, String nome) {
    return Pattern.compile("(?<![\\p{L}\\d])" + Pattern.quote(nome.toLowerCase(Locale.ROOT))
        + "(?![\\p{L}\\d])").matcher(mensagem).find();
  }

  /** Quantas vezes cada gênero e estilo aparece nas compras; o preferido vale mais. */
  private static Map<String, Integer> gosto(String instrucao) {
    Map<String, Integer> gosto = new HashMap<>();
    Matcher compra = LINHA_DE_COMPRA.matcher(instrucao);
    while (compra.find()) {
      categorias(compra.group(2)).forEach(categoria -> gosto.merge(categoria, 1, Integer::sum));
    }
    Matcher preferidos = PREFERIDOS.matcher(instrucao);
    if (preferidos.find() && !"não informou".equals(preferidos.group(1))) {
      categorias(preferidos.group(1))
          .forEach(categoria -> gosto.merge(categoria, PESO_PREFERENCIA, Integer::sum));
    }
    return gosto;
  }

  private static Set<String> comprados(String instrucao) {
    Set<String> comprados = new HashSet<>();
    Matcher compra = LINHA_DE_COMPRA.matcher(instrucao);
    while (compra.find()) {
      comprados.add(compra.group(1));
    }
    return comprados;
  }

  private String resposta(String texto, List<String[]> sugestoes) {
    ObjectNode resposta = objectMapper.createObjectNode();
    resposta.put("texto", texto);
    ArrayNode lista = resposta.putArray("sugestoes");
    sugestoes.forEach(sugestao -> lista.addObject().put("discoId", Long.parseLong(sugestao[0]))
        .put("motivo", sugestao[1]));
    return resposta.toString();
  }

  private static Set<String> categorias(String lista) {
    Set<String> categorias = new LinkedHashSet<>();
    Arrays.stream(lista.split(",")).map(String::strip).filter(c -> !c.isEmpty())
        .forEach(categorias::add);
    return categorias;
  }

  private static int afinidade(DiscoDoAcervo disco, Map<String, Integer> gosto) {
    return disco.categorias().stream().mapToInt(c -> gosto.getOrDefault(c, 0)).sum();
  }

  private record DiscoDoAcervo(Long id, String titulo, String artista, String ano,
      Set<String> categorias) {
  }

  @Override
  public String publicarDataset(String nome, String jsonl) {
    return "simulado://datasets/" + nome;
  }

  @Override
  public String iniciarAjuste(String datasetUri, String nome) {
    return "simulado/ajustes/" + nome;
  }

  @Override
  public SituacaoAjuste consultarAjuste(String job) {
    return new SituacaoAjuste(Treinamento.CONCLUIDO, job.replace("ajustes", "modelos"), null);
  }
}
