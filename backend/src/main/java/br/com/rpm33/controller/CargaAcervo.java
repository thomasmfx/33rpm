package br.com.rpm33.controller;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import br.com.rpm33.model.Artista;
import br.com.rpm33.model.Categoria;
import br.com.rpm33.model.Disco;
import br.com.rpm33.model.Edicao;
import br.com.rpm33.model.EntradaEstoque;
import br.com.rpm33.model.Formato;
import br.com.rpm33.model.Fornecedor;
import br.com.rpm33.model.Gravadora;
import br.com.rpm33.model.GrupoPrecificacao;
import br.com.rpm33.model.MotivoStatus;
import br.com.rpm33.repository.DiscoRepository;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;
import jakarta.persistence.EntityManager;
import jakarta.persistence.FlushModeType;

/**
 * D3: o acervo da demonstração entra pelas mesmas regras da curadoria — cadastro do
 * disco, entradas em estoque, ajuste de preço e inativação, tudo pela Fachada, com
 * validação e log. Roda na subida quando não há disco e a cada POST /api/dev/reset.
 */
@Component
@Profile("dev")
public class CargaAcervo implements ApplicationRunner {

  /** Gerado por frontend/scripts/gerar-acervo.mjs; não se edita à mão. */
  private static final String ARQUIVO = "carga/acervo.json";

  private final IFachada fachada;
  private final DiscoRepository discoRepository;
  private final ObjectMapper objectMapper;
  private final EntityManager entityManager;

  public CargaAcervo(IFachada fachada, DiscoRepository discoRepository,
      ObjectMapper objectMapper, EntityManager entityManager) {
    this.fachada = fachada;
    this.discoRepository = discoRepository;
    this.objectMapper = objectMapper;
    this.entityManager = entityManager;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (discoRepository.count() > 0) {
      return;
    }
    List<String> falhas = carregar();
    if (!falhas.isEmpty()) {
      throw new IllegalStateException("Carga do acervo recusada: " + String.join(" | ", falhas));
    }
  }

  /** Na ordem do arquivo, para os ids (1..69) e os códigos DSC saírem sempre iguais. */
  @Transactional
  public List<String> carregar() {
    // Carga em massa: sem flush antes de cada consulta, o que custava uma conferência do
    // contexto inteiro por consulta. Nada do que ela consulta depende de alteração
    // pendente: disco, entrada, motivo e log são gravados já no persist (IDENTITY).
    FlushModeType modoAnterior = entityManager.getFlushMode();
    entityManager.setFlushMode(FlushModeType.COMMIT);
    try {
      Dominios dominios = new Dominios();
      List<String> falhas = new ArrayList<>();
      for (ItemAcervo item : ler()) {
        dominios.referenciarPorId(item);
        cadastrar(item, falhas);
      }
      return falhas;
    } finally {
      entityManager.setFlushMode(modoAnterior);
    }
  }

  private void cadastrar(ItemAcervo item, List<String> falhas) {
    Resultado cadastro = fachada.inserir(item.disco());
    if (cadastro.temErro()) {
      anotar(falhas, item, cadastro);
      return;
    }
    Disco disco = (Disco) cadastro.primeira();
    for (EntradaEstoque entrada : item.entradas()) {
      entrada.setDiscoId(disco.getId());
      anotar(falhas, item, fachada.inserir(entrada));
    }

    // na mesma transação, disco é o objeto que as entradas acabaram de reprecificar
    if (item.precoVenda() != null && item.precoVenda().compareTo(disco.getPrecoVenda()) != 0) {
      Disco preco = new Disco();
      preco.setId(disco.getId());
      preco.setPrecoVenda(item.precoVenda());
      preco.setAutorizacaoGerente(item.autorizacaoGerente());
      anotar(falhas, item, fachada.alterar(preco));
    }
    if (item.inativacao() != null) {
      Disco inativo = new Disco();
      inativo.setId(disco.getId());
      inativo.setMotivoStatus(item.inativacao());
      anotar(falhas, item, fachada.excluir(inativo));
    }
  }

  private List<ItemAcervo> ler() {
    try (InputStream arquivo = new ClassPathResource(ARQUIVO).getInputStream()) {
      return objectMapper.readValue(arquivo, new TypeReference<List<ItemAcervo>>() {
      });
    } catch (IOException e) {
      throw new UncheckedIOException("Não foi possível ler " + ARQUIVO, e);
    }
  }

  private static void anotar(List<String> falhas, ItemAcervo item, Resultado resultado) {
    resultado.getMensagens()
        .forEach(mensagem -> falhas.add(item.disco().getTitulo() + ": " + mensagem));
  }

  /** Um disco do acervo: o cadastro, o histórico de entradas, o preço e o status do mock. */
  record ItemAcervo(Disco disco, List<EntradaEstoque> entradas, BigDecimal precoVenda,
      String autorizacaoGerente, MotivoStatus inativacao) {
  }

  /**
   * Os domínios já carregados no contexto de persistência. Trocar o nome pelo id faz o
   * cadastro achar cada referência ali, em vez de uma consulta por nome; o que não
   * estiver aqui segue por nome, e a regra do cadastro decide (cria estilo, recusa gênero).
   */
  private final class Dominios {
    private final Map<String, Artista> artistas = porNome(Artista.class, Artista::getNome);
    private final Map<String, Gravadora> gravadoras = porNome(Gravadora.class, Gravadora::getNome);
    private final Map<String, Categoria> categorias =
        porNome(Categoria.class, categoria -> categoria.getTipo() + ":" + categoria.getDesc());
    private final Map<String, Edicao> edicoes = porNome(Edicao.class, Edicao::getNome);
    private final Map<String, Formato> formatos = porNome(Formato.class, Formato::getNome);
    private final Map<String, GrupoPrecificacao> grupos =
        porNome(GrupoPrecificacao.class, GrupoPrecificacao::getNome);
    private final Map<String, Fornecedor> fornecedores =
        porNome(Fornecedor.class, Fornecedor::getNome);

    private void referenciarPorId(ItemAcervo item) {
      Disco disco = item.disco();
      Artista artista = artistas.get(chave(disco.getArtista().getNome()));
      if (artista != null) {
        disco.getArtista().setId(artista.getId());
      }
      Gravadora gravadora = gravadoras.get(chave(disco.getGravadora().getNome()));
      if (gravadora != null) {
        disco.getGravadora().setId(gravadora.getId());
      }
      for (Categoria informada : disco.getCategorias()) {
        Categoria categoria = categorias.get(chave(informada.getTipo() + ":" + informada.getDesc()));
        if (categoria != null) {
          informada.setId(categoria.getId());
        }
      }
      for (Edicao informada : disco.getEdicoes()) {
        Edicao edicao = edicoes.get(chave(informada.getNome()));
        if (edicao != null) {
          informada.setId(edicao.getId());
        }
      }
      Formato formato = formatos.get(chave(disco.getFormato().getNome()));
      if (formato != null) {
        disco.getFormato().setId(formato.getId());
      }
      GrupoPrecificacao grupo = grupos.get(chave(disco.getGrupoPrecificacao().getNome()));
      if (grupo != null) {
        disco.getGrupoPrecificacao().setId(grupo.getId());
      }
      for (EntradaEstoque entrada : item.entradas()) {
        Fornecedor fornecedor = fornecedores.get(chave(entrada.getFornecedor().getNome()));
        if (fornecedor != null) {
          entrada.getFornecedor().setId(fornecedor.getId());
        }
      }
    }

    private <T> Map<String, T> porNome(Class<T> tipo, Function<T, String> nome) {
      return entityManager.createQuery("select e from " + tipo.getSimpleName() + " e", tipo)
          .getResultList().stream()
          .collect(Collectors.toMap(e -> chave(nome.apply(e)), Function.identity(), (a, b) -> a));
    }

    private static String chave(String nome) {
      return nome == null ? "" : nome.trim().toLowerCase();
    }
  }
}
