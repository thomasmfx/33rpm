package br.com.rpm33.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import br.com.rpm33.model.Categoria;
import br.com.rpm33.model.Disco;
import br.com.rpm33.service.ContextoAssistente.RespostaIa;
import br.com.rpm33.service.ContextoAssistente.SugestaoIa;

/**
 * RNF0044 item 3: exemplos de treino com as outras tarefas do chat (dúvida sobre um disco,
 * busca por título, artista, estilo ou preço e pergunta fora do tema), respondidas com os
 * dados do acervo que vai no próprio exemplo. O treino de 22/11/2026, só com vendas e
 * feedback, ensinou o modelo a responder qualquer pergunta como recomendação.
 */
final class PerguntasDoAcervo {

  private static final List<String> FORA_DO_TEMA = List.of(
      "Qual a previsão do tempo pra amanhã?",
      "Me ajuda com a lição de matemática?",
      "Quem ganhou o jogo de ontem?",
      "Me passa uma receita de bolo de cenoura?",
      "Qual a capital da Austrália?",
      "Pode escrever um e-mail pro meu chefe?",
      "Quanto está o dólar hoje?",
      "Me conta uma piada?");

  /**
   * Artistas e discos conhecidos para a busca sem resultado; os que a loja tiver ficam de
   * fora. Com um disco da loja, o modelo poderia decorar que ele está em falta.
   */
  private static final List<String> ARTISTAS_DE_FORA = List.of(
      "The Beatles", "Taylor Swift", "Bob Marley", "Madonna", "Queen", "Adele", "Coldplay",
      "Elis Regina");
  private static final List<String> TITULOS_DE_FORA = List.of(
      "Abbey Road", "Rumours", "Back In Black", "Led Zeppelin IV", "Hotel California",
      "The Joshua Tree", "Clube Da Esquina", "Legend", "1989", "Born To Run");

  private PerguntasDoAcervo() {
  }

  record Exemplo(String pergunta, RespostaIa resposta) {
  }

  /**
   * tipo alterna a tarefa de um exemplo para o outro. acervo é o do exemplo, e catalogo, o
   * da loja inteira. A tarefa sem disco que sirva vira uma dúvida, que sempre tem resposta.
   */
  static Exemplo gerar(int tipo, String nome, List<Disco> acervo, List<Disco> catalogo,
      Set<Long> jaComprados, Random sorteio) {
    List<Disco> disponiveis = acervo.stream()
        .filter(disco -> !jaComprados.contains(disco.getId())).toList();
    Optional<Exemplo> exemplo = switch (tipo % 6) {
      case 1 -> artista(disponiveis, catalogo, sorteio);
      case 2 -> estilo(disponiveis, sorteio);
      case 4 -> preco(disponiveis, sorteio);
      case 5 -> Optional.of(foraDoTema(nome, sorteio));
      default -> Optional.empty();
    };
    return exemplo.orElseGet(() -> duvida(acervo, catalogo, sorteio));
  }

  /** "A (X), B (Y) e C (Z)". */
  static String listar(List<Disco> discos) {
    return emLista(discos.stream()
        .map(disco -> disco.getTitulo() + " (" + disco.getArtista().getNome() + ")").toList());
  }

  private static Exemplo duvida(List<Disco> acervo, List<Disco> catalogo, Random sorteio) {
    Disco disco = acervo.get(sorteio.nextInt(acervo.size()));
    String titulo = disco.getTitulo();
    String artista = disco.getArtista().getNome();
    String ano = disco.getAnoLancamento() == null ? null
        : String.valueOf(disco.getAnoLancamento().getYear());
    int pergunta = sorteio.nextInt(5);
    if (pergunta == 2 && disco.getPrecoVenda() == null) {
      pergunta = 1;
    }
    return switch (pergunta) {
      case 0 -> new Exemplo("De que ano é o " + titulo + "?", semSugestao(ano == null
          ? "O acervo não traz o ano de lançamento de " + titulo + ", de " + artista + "."
          : titulo + ", de " + artista + ", saiu em " + ano + "."));
      case 1 -> new Exemplo("Quem gravou o " + titulo + "?", semSugestao(titulo + " é de "
          + artista + (ano == null ? "." : ", lançado em " + ano + ".")));
      case 2 -> new Exemplo("Quanto custa o " + titulo + "?", semSugestao(titulo + ", de "
          + artista + ", sai por " + ContextoAssistente.preco(disco.getPrecoVenda())
          + " aqui na loja."));
      case 3 -> new Exemplo("Que tipo de som é o " + titulo + "?", semSugestao(titulo + ", de "
          + artista + ", é um disco de " + emLista(disco.getCategorias().stream()
              .sorted(Comparator.comparing(Categoria::getId)).map(Categoria::getDesc).toList())
          + "."));
      default -> procuraPorTitulo(acervo, catalogo, sorteio);
    };
  }

  /** O disco pedido pelo título, no acervo do exemplo ou fora da loja. */
  private static Exemplo procuraPorTitulo(List<Disco> acervo, List<Disco> catalogo,
      Random sorteio) {
    List<String> ausentes = deFora(TITULOS_DE_FORA, catalogo.stream().map(Disco::getTitulo));
    if (!ausentes.isEmpty() && sorteio.nextBoolean()) {
      String ausente = ausentes.get(sorteio.nextInt(ausentes.size()));
      return new Exemplo("Vocês têm o " + ausente + "?", semSugestao("No momento, " + ausente
          + " não está no acervo. Quer que eu indique algo parecido?"));
    }
    Disco disco = acervo.get(sorteio.nextInt(acervo.size()));
    String preco = disco.getPrecoVenda() == null ? ""
        : ", e sai por " + ContextoAssistente.preco(disco.getPrecoVenda());
    return new Exemplo("Vocês têm o " + disco.getTitulo() + "?",
        new RespostaIa("Temos sim! " + disco.getTitulo() + " é de " + disco.getArtista().getNome()
            + preco + ".", List.of(new SugestaoIa(disco.getId(), "O disco que você procurou"))));
  }

  private static Optional<Exemplo> artista(List<Disco> disponiveis, List<Disco> catalogo,
      Random sorteio) {
    if (sorteio.nextInt(4) == 0) {
      List<String> ausentes = deFora(ARTISTAS_DE_FORA,
          catalogo.stream().map(disco -> disco.getArtista().getNome()));
      if (!ausentes.isEmpty()) {
        String ausente = ausentes.get(sorteio.nextInt(ausentes.size()));
        return Optional.of(new Exemplo("Tem algo de " + ausente + "?", semSugestao(
            "No momento não temos " + ausente + " no acervo. Se quiser, indico algo parecido.")));
      }
    }
    if (disponiveis.isEmpty()) {
      return Optional.empty();
    }
    String artista = disponiveis.get(sorteio.nextInt(disponiveis.size())).getArtista().getNome();
    List<Disco> doArtista = disponiveis.stream()
        .filter(disco -> disco.getArtista().getNome().equals(artista)).limit(3).toList();
    String pergunta = switch (sorteio.nextInt(3)) {
      case 0 -> "Tem algo de " + artista + "?";
      case 1 -> "Vocês têm disco de " + artista + "?";
      default -> "Quero ouvir " + artista + ". O que tem aí?";
    };
    String titulos = emLista(doArtista.stream().map(Disco::getTitulo).toList());
    return Optional.of(new Exemplo(pergunta, new RespostaIa("De " + artista + ", tem " + titulos
        + ".", doArtista.stream()
            .map(disco -> new SugestaoIa(disco.getId(), "É de " + artista + ", como você pediu"))
            .toList())));
  }

  private static Optional<Exemplo> estilo(List<Disco> disponiveis, Random sorteio) {
    List<Categoria> categorias = disponiveis.stream()
        .flatMap(disco -> disco.getCategorias().stream()).distinct()
        .sorted(Comparator.comparing(Categoria::getId)).toList();
    if (categorias.isEmpty()) {
      return Optional.empty();
    }
    Categoria categoria = categorias.get(sorteio.nextInt(categorias.size()));
    String nome = categoria.getDesc();
    List<Disco> discos = disponiveis.stream()
        .filter(disco -> disco.getCategorias().contains(categoria)).limit(3).toList();
    String pergunta = switch (sorteio.nextInt(3)) {
      case 0 -> "Quero algo de " + nome + ".";
      case 1 -> "O que vocês têm de " + nome + "?";
      default -> "Me indica um disco de " + nome + "?";
    };
    return Optional.of(new Exemplo(pergunta, new RespostaIa("De " + nome + ", separei "
        + listar(discos) + ".", discos.stream()
            .map(disco -> new SugestaoIa(disco.getId(), "É " + nome + ", como você pediu"))
            .toList())));
  }

  /** O teto é o preço de um dos três mais baratos, arredondado para cima até a dezena. */
  private static Optional<Exemplo> preco(List<Disco> disponiveis, Random sorteio) {
    List<Disco> comPreco = disponiveis.stream().filter(disco -> disco.getPrecoVenda() != null)
        .sorted(Comparator.comparing(Disco::getPrecoVenda)).toList();
    if (comPreco.isEmpty()) {
      return Optional.empty();
    }
    BigDecimal teto = comPreco.get(sorteio.nextInt(Math.min(3, comPreco.size())))
        .getPrecoVenda().divide(BigDecimal.TEN, 0, RoundingMode.CEILING)
        .multiply(BigDecimal.TEN);
    List<Disco> discos = comPreco.stream()
        .filter(disco -> disco.getPrecoVenda().compareTo(teto) <= 0).limit(3).toList();
    String valor = "R$ " + teto.toPlainString();
    String pergunta = sorteio.nextBoolean() ? "Tem algum disco até " + valor + "?"
        : "Quero gastar no máximo " + valor + ". O que tem?";
    String lista = emLista(discos.stream().map(disco -> disco.getTitulo() + " ("
        + disco.getArtista().getNome() + ") por " + ContextoAssistente.preco(disco.getPrecoVenda()))
        .toList());
    return Optional.of(new Exemplo(pergunta, new RespostaIa("Até " + valor + ", tem " + lista
        + ".", discos.stream()
            .map(disco -> new SugestaoIa(disco.getId(), "Sai por "
                + ContextoAssistente.preco(disco.getPrecoVenda())
                + ", dentro do que você quer gastar"))
            .toList())));
  }

  private static Exemplo foraDoTema(String nome, Random sorteio) {
    String pergunta = FORA_DO_TEMA.get(sorteio.nextInt(FORA_DO_TEMA.size()));
    String texto = switch (sorteio.nextInt(3)) {
      case 0 -> "Só consigo ajudar com discos e com a loja, " + nome
          + ". Quer uma recomendação pra ouvir?";
      case 1 -> "Isso eu não sei responder: aqui eu cuido só dos discos da 33rpm. Posso te "
          + "indicar algo pra ouvir?";
      default -> "Desculpa, " + nome + ", só ajudo com o acervo da loja. Quer buscar algum disco?";
    };
    return new Exemplo(pergunta, semSugestao(texto));
  }

  private static List<String> deFora(List<String> nomes, Stream<String> daLoja) {
    Set<String> existentes = daLoja.map(nome -> nome.toLowerCase(Locale.ROOT))
        .collect(Collectors.toSet());
    return nomes.stream().filter(nome -> !existentes.contains(nome.toLowerCase(Locale.ROOT)))
        .toList();
  }

  private static RespostaIa semSugestao(String texto) {
    return new RespostaIa(texto, List.of());
  }

  private static String emLista(List<String> itens) {
    if (itens.size() <= 1) {
      return String.join("", itens);
    }
    return String.join(", ", itens.subList(0, itens.size() - 1)) + " e "
        + itens.get(itens.size() - 1);
  }
}
