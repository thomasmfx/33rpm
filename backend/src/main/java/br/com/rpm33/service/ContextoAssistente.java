package br.com.rpm33.service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import br.com.rpm33.model.Categoria;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.Disco;
import br.com.rpm33.model.ItemPedido;
import br.com.rpm33.model.Pedido;
import br.com.rpm33.model.StatusPedido;
import br.com.rpm33.repository.PedidoRepository;

/**
 * RNF0044: o texto que a IA recebe, igual na conversa e nos exemplos de treino. O ajuste
 * fino só ensina o que serve na conversa se o exemplo tiver o mesmo formato dela: regras,
 * perfil do cliente e acervo.
 */
@Component
public class ContextoAssistente {

  static final String REGRAS = """
      Você é o assistente de recomendação da 33rpm, uma loja online de discos de vinil. Fale \
      em português do Brasil, em tom próximo, com respostas curtas (até quatro frases).
      Você ajuda o cliente a buscar discos no acervo, responde dúvidas sobre os discos e \
      recomenda o que ouvir.
      Regras:
      - Sugira só discos da seção ACERVO, pelo id. Se nada no acervo atende ao pedido, diga isso.
      - Personalize pelo PERFIL DO CLIENTE. Compras e gêneros preferidos pesam, mas não \
      limitam: numa recomendação, traga até três discos, em geral dois ligados ao gosto do \
      cliente e uma descoberta de outro gênero, que clientes com gosto parecido costumam levar.
      - Não sugira disco que o cliente já comprou, a não ser que ele peça.
      - Um pedido explícito do cliente (gênero, artista, clima, faixa de preço) vale mais \
      que o perfil.
      - Em dúvidas sobre um disco, use os dados do acervo e não invente faixas, datas nem fatos.
      - Se a pergunta não tiver relação com música ou com a loja, diga com gentileza que só \
      ajuda com discos.
      - Cada motivo é uma frase curta que diz o que liga o disco ao cliente.
      Responda só com um objeto JSON, sem texto fora dele, neste formato:
      {"texto": "sua resposta ao cliente", "sugestoes": [{"discoId": 12, "motivo": "Tem o \
      Boom Bap de Illmatic, que você levou"}]}
      Use "sugestoes": [] quando não houver disco a sugerir.""";

  private static final int COMPRAS_NO_PERFIL = 20;
  private static final int TAMANHO_DESCRICAO = 200;
  private static final Locale PT_BR = Locale.of("pt", "BR");

  /** A compra que não aconteceu, ou ainda não foi aprovada, não diz nada do gosto. */
  private static final Set<String> NAO_E_COMPRA =
      Set.of(StatusPedido.REPROVADA, StatusPedido.EM_PROCESSAMENTO);

  private final PedidoRepository pedidoRepository;
  private final ObjectMapper objectMapper;

  public ContextoAssistente(PedidoRepository pedidoRepository, ObjectMapper objectMapper) {
    this.pedidoRepository = pedidoRepository;
    this.objectMapper = objectMapper;
  }

  /** As compras do cliente, da mais recente para a mais antiga. */
  public List<Pedido> compras(Long clienteId) {
    return pedidoRepository.findByClienteIdOrderByDataCadastroDescIdDesc(clienteId).stream()
        .filter(ContextoAssistente::eCompra).toList();
  }

  public static boolean eCompra(Pedido pedido) {
    return !NAO_E_COMPRA.contains(pedido.getStatus().getDescricao());
  }

  /** compras na ordem da mais recente para a mais antiga. */
  public String perfil(Cliente cliente, List<Pedido> compras) {
    StringBuilder perfil = new StringBuilder("PERFIL DO CLIENTE\n");
    perfil.append("Nome: ").append(cliente.getNome().trim().split("\\s+")[0]).append('\n');
    perfil.append("Gêneros e estilos preferidos: ").append(cliente.getPreferencias().isEmpty()
        ? "não informou"
        : cliente.getPreferencias().stream().map(Categoria::getDesc)
            .collect(Collectors.joining(", ")))
        .append('\n');

    List<String> linhas = new ArrayList<>();
    for (Pedido pedido : compras) {
      for (ItemPedido item : pedido.getItens()) {
        if (linhas.size() < COMPRAS_NO_PERFIL) {
          Disco disco = item.getDisco();
          linhas.add("- " + YearMonth.from(pedido.getDataCadastro()) + " | " + disco.getTitulo()
              + " | " + disco.getArtista().getNome() + " | " + categorias(disco));
        }
      }
    }
    perfil.append("Compras, da mais recente para a mais antiga:")
        .append(linhas.isEmpty() ? " nenhuma compra ainda" : "\n" + String.join("\n", linhas));
    return perfil.toString();
  }

  public String instrucao(String perfil, List<Disco> acervo) {
    return REGRAS + "\n\n" + perfil + "\n\n"
        + "ACERVO (id | título | artista | ano | gêneros e estilos | preço | descrição)\n"
        + acervo.stream().map(this::linha).collect(Collectors.joining("\n"));
  }

  private String linha(Disco disco) {
    String ano = disco.getAnoLancamento() == null ? "?"
        : String.valueOf(disco.getAnoLancamento().getYear());
    return disco.getId() + " | " + disco.getTitulo() + " | " + disco.getArtista().getNome()
        + " | " + ano + " | " + categorias(disco) + " | " + preco(disco.getPrecoVenda()) + " | "
        + resumo(disco.getDescricao());
  }

  private static String categorias(Disco disco) {
    return disco.getCategorias().stream().map(Categoria::getDesc)
        .collect(Collectors.joining(", "));
  }

  static String preco(BigDecimal valor) {
    return valor == null ? "sem preço" : String.format(PT_BR, "R$ %.2f", valor);
  }

  private static String resumo(String descricao) {
    if (descricao == null || descricao.isBlank()) {
      return "sem descrição";
    }
    String texto = descricao.strip().replaceAll("\\s+", " ");
    if (texto.length() <= TAMANHO_DESCRICAO) {
      return texto;
    }
    int corte = texto.lastIndexOf(' ', TAMANHO_DESCRICAO);
    return texto.substring(0, corte > 0 ? corte : TAMANHO_DESCRICAO) + "…";
  }

  /**
   * O gosto de costume do cliente: os gêneros principais de ao menos um quarto dos discos
   * que ele comprou, mais os gêneros e estilos que declarou. Disco fora dele é descoberta.
   */
  public Gosto gosto(Cliente cliente, List<Pedido> compras) {
    Map<Long, Integer> porGenero = new HashMap<>();
    int total = 0;
    for (Pedido pedido : compras) {
      for (ItemPedido item : pedido.getItens()) {
        porGenero.merge(item.getDisco().getGeneroPrincipal().getId(), 1, Integer::sum);
        total++;
      }
    }
    Set<Long> generos = new HashSet<>();
    int minimo = total;
    porGenero.forEach((genero, quantos) -> {
      if (quantos * 4 >= minimo) {
        generos.add(genero);
      }
    });
    Set<Long> estilos = new HashSet<>();
    for (Categoria preferida : cliente.getPreferencias()) {
      (Categoria.GENERO.equals(preferida.getTipo()) ? generos : estilos).add(preferida.getId());
    }
    return new Gosto(generos, estilos);
  }

  /**
   * A resposta da IA em JSON. O modelo às vezes cerca o JSON com texto ou crases; o que
   * estiver entre a primeira e a última chave vale. Sem JSON, o texto vira a resposta, sem
   * sugestões.
   */
  public RespostaIa interpretar(String bruto) {
    String texto = bruto == null ? "" : bruto.strip();
    int inicio = texto.indexOf('{');
    int fim = texto.lastIndexOf('}');
    if (inicio >= 0 && fim > inicio) {
      try {
        JsonNode json = objectMapper.readTree(texto.substring(inicio, fim + 1));
        List<SugestaoIa> sugestoes = new ArrayList<>();
        for (JsonNode sugestao : json.path("sugestoes")) {
          long discoId = sugestao.path("discoId").asLong(0);
          if (discoId > 0) {
            sugestoes.add(new SugestaoIa(discoId, sugestao.path("motivo").asString("")));
          }
        }
        return new RespostaIa(json.path("texto").asString("").strip(), sugestoes);
      } catch (RuntimeException e) {
        // JSON quebrado: segue como texto puro
      }
    }
    return new RespostaIa(texto, List.of());
  }

  public String serializar(RespostaIa resposta) {
    var json = objectMapper.createObjectNode();
    json.put("texto", resposta.texto());
    var sugestoes = json.putArray("sugestoes");
    resposta.sugestoes().forEach(sugestao -> sugestoes.addObject()
        .put("discoId", sugestao.discoId()).put("motivo", sugestao.motivo()));
    return json.toString();
  }

  public record Gosto(Set<Long> generos, Set<Long> estilos) {

    public boolean temAfinidade(Disco disco) {
      return generos.contains(disco.getGeneroPrincipal().getId())
          || disco.getCategorias().stream().anyMatch(c -> estilos.contains(c.getId()));
    }
  }

  public record RespostaIa(String texto, List<SugestaoIa> sugestoes) {
  }

  public record SugestaoIa(long discoId, String motivo) {
  }
}
