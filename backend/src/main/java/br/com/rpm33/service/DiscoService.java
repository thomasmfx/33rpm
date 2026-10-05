package br.com.rpm33.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Artista;
import br.com.rpm33.model.Categoria;
import br.com.rpm33.model.CategoriaStatus;
import br.com.rpm33.model.Disco;
import br.com.rpm33.model.DiscoFiltro;
import br.com.rpm33.model.Edicao;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.model.Formato;
import br.com.rpm33.model.Gravadora;
import br.com.rpm33.model.GrupoPrecificacao;
import br.com.rpm33.model.InativacaoAutomatica;
import br.com.rpm33.model.MotivoStatus;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.repository.ArtistaRepository;
import br.com.rpm33.repository.CategoriaRepository;
import br.com.rpm33.repository.CategoriaStatusRepository;
import br.com.rpm33.repository.DiscoRepository;
import br.com.rpm33.repository.EdicaoRepository;
import br.com.rpm33.repository.EntradaEstoqueRepository;
import br.com.rpm33.repository.FormatoRepository;
import br.com.rpm33.repository.GravadoraRepository;
import br.com.rpm33.repository.GrupoPrecificacaoRepository;
import br.com.rpm33.repository.MotivoStatusRepository;

/**
 * Regras do cadastro de discos (RF0011 a RF0016). O preço nasce e acompanha as
 * entradas em estoque (EstoqueService); aqui ele só muda pela curadoria, sob a RN0014.
 */
@Service("Disco")
public class DiscoService implements IService {

  private static final int JUSTIFICATIVA_MINIMA = 10;
  private static final int ANO_MINIMO = 1900;
  private static final int ANO_MAXIMO = 2030;

  private final DiscoRepository discoRepository;
  private final ArtistaRepository artistaRepository;
  private final GravadoraRepository gravadoraRepository;
  private final CategoriaRepository categoriaRepository;
  private final EdicaoRepository edicaoRepository;
  private final FormatoRepository formatoRepository;
  private final GrupoPrecificacaoRepository grupoPrecificacaoRepository;
  private final CategoriaStatusRepository categoriaStatusRepository;
  private final MotivoStatusRepository motivoStatusRepository;
  private final EntradaEstoqueRepository entradaEstoqueRepository;
  private final RegistradorLog registradorLog;
  private final int diasSemVenda;

  public DiscoService(DiscoRepository discoRepository, ArtistaRepository artistaRepository,
      GravadoraRepository gravadoraRepository, CategoriaRepository categoriaRepository,
      EdicaoRepository edicaoRepository, FormatoRepository formatoRepository,
      GrupoPrecificacaoRepository grupoPrecificacaoRepository,
      CategoriaStatusRepository categoriaStatusRepository,
      MotivoStatusRepository motivoStatusRepository,
      EntradaEstoqueRepository entradaEstoqueRepository, RegistradorLog registradorLog,
      @Value("${app.inativacao-automatica.dias-sem-venda}") int diasSemVenda) {
    this.discoRepository = discoRepository;
    this.artistaRepository = artistaRepository;
    this.gravadoraRepository = gravadoraRepository;
    this.categoriaRepository = categoriaRepository;
    this.edicaoRepository = edicaoRepository;
    this.formatoRepository = formatoRepository;
    this.grupoPrecificacaoRepository = grupoPrecificacaoRepository;
    this.categoriaStatusRepository = categoriaStatusRepository;
    this.motivoStatusRepository = motivoStatusRepository;
    this.entradaEstoqueRepository = entradaEstoqueRepository;
    this.registradorLog = registradorLog;
    this.diasSemVenda = diasSemVenda;
  }

  /** RF0011: nasce ativo, sem estoque e sem preço — RN0013: sem custo não há preço. */
  @Override
  @Transactional
  public Resultado salvar(EntidadeDominio entidade) {
    Disco entrada = (Disco) entidade;
    Cadastro cadastro = new Cadastro();
    List<String> erros = validarCadastro(entrada, cadastro);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }

    Disco novo = new Disco();
    copiarCadastro(entrada, novo, cadastro);
    novo.setCodigo("DSC-%06d".formatted(discoRepository.proximoNumeroDeCodigo()));
    novo.setPrecoVenda(RegrasPreco.ZERO);
    novo.setEstoque(0);
    novo.setIsAtivo(true);

    Disco salvo = discoRepository.save(novo);
    registrar(OperacaoLog.INSERIR, salvo, null, RegistradorLog.CURADORIA);
    return Resultado.com(salvo);
  }

  /**
   * RF0014 e RF0016, conforme o que veio preenchido (como no cliente), e a rotina da
   * RF0013 quando a entidade é o pedido de inativação automática.
   */
  @Override
  @Transactional
  public Resultado alterar(EntidadeDominio entidade) {
    if (entidade instanceof InativacaoAutomatica) {
      return Resultado.de(inativarParados());
    }
    Disco entrada = (Disco) entidade;
    Disco atual = encontrar(entrada.getId());
    if (atual == null) {
      return Resultado.erro("Disco não encontrado.");
    }
    if (apenasStatus(entrada)) {
      return ativar(atual, entrada.getMotivoStatus());
    }

    BigDecimal maiorCusto = entradaEstoqueRepository.maiorCusto(atual.getId());
    if (apenasPreco(entrada)) {
      List<String> erros = validarPreco(entrada, maiorCusto, atual.getGrupoPrecificacao());
      if (!erros.isEmpty()) {
        return Resultado.erro(erros);
      }
      aplicarPreco(entrada, atual, maiorCusto);
    } else {
      Cadastro cadastro = new Cadastro();
      List<String> erros = validarCadastro(entrada, cadastro);
      if (entrada.getPrecoVenda() != null && cadastro.grupo != null) {
        erros.addAll(validarPreco(entrada, maiorCusto, cadastro.grupo));
      }
      if (!erros.isEmpty()) {
        return Resultado.erro(erros);
      }
      copiarCadastro(entrada, atual, cadastro);
      if (entrada.getPrecoVenda() != null) {
        aplicarPreco(entrada, atual, maiorCusto);
      }
    }

    registrar(OperacaoLog.ALTERAR, atual, null, RegistradorLog.CURADORIA);
    enriquecer(List.of(atual));
    return Resultado.com(atual);
  }

  /** RF0015 pelo filtro, carga da tela pelo id, a vitrine inteira sem filtro. */
  @Override
  @Transactional(readOnly = true)
  public Resultado consultar(EntidadeDominio entidade) {
    if (entidade instanceof DiscoFiltro filtro) {
      List<Disco> encontrados = discoRepository.findAll(DiscoSpecs.de(filtro), Sort.by("titulo"));
      enriquecer(encontrados);
      return Resultado.de(encontrados);
    }

    Disco disco = (Disco) entidade;
    if (disco.getId() != null) {
      Disco encontrado = encontrar(disco.getId());
      if (encontrado == null) {
        return Resultado.erro("Disco não encontrado.");
      }
      enriquecer(List.of(encontrado));
      return Resultado.com(encontrado);
    }
    List<Disco> todos = discoRepository.findAll(Sort.by("titulo"));
    enriquecer(todos);
    return Resultado.de(todos);
  }

  /**
   * RF0012 e RN0015: inativação lógica, com categoria e justificativa. O disco sai da
   * loja, mas continua no histórico dos pedidos e do estoque.
   */
  @Override
  @Transactional
  public Resultado excluir(EntidadeDominio entidade) {
    Disco entrada = (Disco) entidade;
    Disco atual = encontrar(entrada.getId());
    if (atual == null) {
      return Resultado.erro("Disco não encontrado.");
    }
    List<String> erros = new ArrayList<>();
    CategoriaStatus categoria =
        validarMotivo(entrada.getMotivoStatus(), CategoriaStatus.INATIVACAO, erros);
    if (Boolean.FALSE.equals(atual.getIsAtivo())) {
      erros.add("O disco já está inativo.");
    }
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }

    inativar(atual, categoria, entrada.getMotivoStatus().getJustificativa().trim(), false,
        RegistradorLog.CURADORIA);
    enriquecer(List.of(atual));
    return Resultado.com(atual);
  }

  /** RF0013: a mesma rotina do botão da curadoria, no horário de app.inativacao-automatica.cron. */
  @Scheduled(cron = "${app.inativacao-automatica.cron}")
  @Transactional
  public void executarInativacaoAutomatica() {
    inativarParados();
  }

  // ------------------------------------------------------------------
  // Status
  // ------------------------------------------------------------------

  /** RF0016 e RN0017: volta à loja com categoria de ativação e justificativa. */
  private Resultado ativar(Disco atual, MotivoStatus motivo) {
    List<String> erros = new ArrayList<>();
    CategoriaStatus categoria = validarMotivo(motivo, CategoriaStatus.ATIVACAO, erros);
    if (Boolean.TRUE.equals(atual.getIsAtivo())) {
      erros.add("O disco já está ativo.");
    }
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }

    atual.setIsAtivo(true);
    MotivoStatus registro =
        registrarMotivo(atual, categoria, motivo.getJustificativa().trim(), false);
    registrar(OperacaoLog.ALTERAR, atual, registro, RegistradorLog.CURADORIA);
    enriquecer(List.of(atual));
    return Resultado.com(atual);
  }

  /**
   * RF0013 e RN0016: ativos sem estoque e sem venda há dias-sem-venda dias; nunca
   * vendido conta como parado. A categoria é sempre FORA DE MERCADO.
   */
  private List<Disco> inativarParados() {
    CategoriaStatus foraDeMercado = categoriaStatusRepository
        .findByDescIgnoreCaseAndTipo(CategoriaStatus.FORA_DE_MERCADO, CategoriaStatus.INATIVACAO)
        .orElseThrow(() -> new IllegalStateException(
            "Categoria FORA DE MERCADO ausente. Rode db/seed.sql."));
    List<Disco> candidatos = discoRepository.findByIsAtivoTrueAndEstoque(0);
    Map<Long, LocalDateTime> vendas = ultimasVendas(ids(candidatos));
    LocalDate hoje = LocalDate.now();

    List<Disco> inativados = new ArrayList<>();
    for (Disco disco : candidatos) {
      LocalDateTime venda = vendas.get(disco.getId());
      Long dias = venda == null ? null : ChronoUnit.DAYS.between(venda.toLocalDate(), hoje);
      if (dias != null && dias < diasSemVenda) {
        continue;
      }
      String justificativa = dias == null
          ? "Inativação automática: sem estoque e sem nenhuma venda registrada."
          : "Inativação automática: sem estoque e sem vendas há " + dias + " dias.";
      inativar(disco, foraDeMercado, justificativa, true, RegistradorLog.ROTINA_AUTOMATICA);
      inativados.add(disco);
    }
    enriquecer(inativados);
    return inativados;
  }

  private void inativar(Disco disco, CategoriaStatus categoria, String justificativa,
      boolean automatico, String usuario) {
    disco.setIsAtivo(false);
    MotivoStatus registro = registrarMotivo(disco, categoria, justificativa, automatico);
    registrar(OperacaoLog.EXCLUIR, disco, registro, usuario);
  }

  private MotivoStatus registrarMotivo(Disco disco, CategoriaStatus categoria,
      String justificativa, boolean automatico) {
    MotivoStatus motivo = new MotivoStatus();
    motivo.setDisco(disco);
    motivo.setCategoria(categoria);
    motivo.setJustificativa(justificativa);
    motivo.setAutomatico(automatico);
    return motivoStatusRepository.save(motivo);
  }

  /** RN0015 e RN0017: categoria do tipo certo e justificativa que diga algo. */
  private CategoriaStatus validarMotivo(MotivoStatus motivo, String tipo, List<String> erros) {
    boolean inativacao = CategoriaStatus.INATIVACAO.equals(tipo);
    String operacao = inativacao ? "inativação" : "ativação";
    String regra = inativacao ? "RN0015" : "RN0017";

    CategoriaStatus categoria = null;
    CategoriaStatus informada = motivo == null ? null : motivo.getCategoria();
    if (informada == null || (informada.getId() == null && vazio(informada.getDesc()))) {
      erros.add("Informe a categoria da " + operacao + " (" + regra + ").");
    } else {
      Optional<CategoriaStatus> encontrada = informada.getId() != null
          ? categoriaStatusRepository.findById(informada.getId())
              .filter(existente -> tipo.equals(existente.getTipo()))
          : categoriaStatusRepository.findByDescIgnoreCaseAndTipo(informada.getDesc().trim(), tipo);
      categoria = encontrada.orElse(null);
      if (categoria == null) {
        erros.add("Categoria " + nomeOuId(informada.getDesc(), informada.getId())
            + " não registrada para " + operacao + " (" + regra + ").");
      }
    }

    String justificativa = motivo == null ? null : motivo.getJustificativa();
    if (justificativa == null || justificativa.trim().length() < JUSTIFICATIVA_MINIMA) {
      erros.add("A justificativa precisa ter ao menos 10 caracteres (" + regra + ").");
    }
    return categoria;
  }

  // ------------------------------------------------------------------
  // Preço
  // ------------------------------------------------------------------

  /** RN0014: abaixo da margem do grupo, o preço só vale com a autorização do gerente. */
  private List<String> validarPreco(Disco entrada, BigDecimal maiorCusto,
      GrupoPrecificacao grupo) {
    BigDecimal sugerido = RegrasPreco.sugerido(maiorCusto, grupo);
    if (RegrasPreco.exigeAutorizacao(entrada.getPrecoVenda(), sugerido)
        && vazio(entrada.getAutorizacaoGerente())) {
      return List.of(
          "RN0014: preço abaixo da margem do grupo exige autorização do gerente de vendas.");
    }
    return List.of();
  }

  private void aplicarPreco(Disco entrada, Disco atual, BigDecimal maiorCusto) {
    // RN0013: sem custo registrado ainda não há preço a formar; ele nasce na 1ª entrada
    if (maiorCusto == null) {
      atual.setPrecoVenda(RegrasPreco.ZERO);
      atual.setAutorizacaoGerente(null);
      return;
    }
    BigDecimal preco = entrada.getPrecoVenda().setScale(2, RoundingMode.HALF_UP);
    BigDecimal sugerido = RegrasPreco.sugerido(maiorCusto, atual.getGrupoPrecificacao());
    atual.setPrecoVenda(preco);
    // a autorização só existe enquanto o preço estiver abaixo da margem
    atual.setAutorizacaoGerente(RegrasPreco.exigeAutorizacao(preco, sugerido)
        ? entrada.getAutorizacaoGerente().trim()
        : null);
  }

  private boolean apenasStatus(Disco entrada) {
    return entrada.getMotivoStatus() != null && entrada.getTitulo() == null
        && entrada.getPrecoVenda() == null;
  }

  private boolean apenasPreco(Disco entrada) {
    return entrada.getTitulo() == null && entrada.getPrecoVenda() != null;
  }

  // ------------------------------------------------------------------
  // Cadastro
  // ------------------------------------------------------------------

  /** O que a validação já resolveu, para a gravação não repetir as consultas. */
  private static final class Cadastro {
    private Artista artista;
    private String artistaNovo;
    private Gravadora gravadora;
    private String gravadoraNova;
    private final List<Categoria> categorias = new ArrayList<>();
    private final Map<String, String> estilosNovos = new LinkedHashMap<>();
    private final List<Edicao> edicoes = new ArrayList<>();
    private Formato formato;
    private GrupoPrecificacao grupo;
  }

  /** RN0011, RN0012 e os domínios da RNF0013. Nada é gravado aqui. */
  private List<String> validarCadastro(Disco entrada, Cadastro cadastro) {
    List<String> erros = new ArrayList<>();
    if (vazio(entrada.getTitulo())) {
      erros.add("Informe o título (RN0011).");
    }

    // artista, gravadora e estilo novos entram no domínio junto com o disco
    Artista artista = entrada.getArtista();
    if (artista == null || (artista.getId() == null && vazio(artista.getNome()))) {
      erros.add("Informe o artista (RN0011).");
    } else if (artista.getId() != null) {
      cadastro.artista = artistaRepository.findById(artista.getId()).orElse(null);
      if (cadastro.artista == null) {
        erros.add("Informe o artista (RN0011).");
      }
    } else {
      cadastro.artistaNovo = artista.getNome().trim();
      cadastro.artista = artistaRepository.findByNomeIgnoreCase(cadastro.artistaNovo).orElse(null);
    }

    Gravadora gravadora = entrada.getGravadora();
    if (gravadora == null || (gravadora.getId() == null && vazio(gravadora.getNome()))) {
      erros.add("Informe a gravadora (RN0011).");
    } else if (gravadora.getId() != null) {
      cadastro.gravadora = gravadoraRepository.findById(gravadora.getId()).orElse(null);
      if (cadastro.gravadora == null) {
        erros.add("Informe a gravadora (RN0011).");
      }
    } else {
      cadastro.gravadoraNova = gravadora.getNome().trim();
      cadastro.gravadora =
          gravadoraRepository.findByNomeIgnoreCase(cadastro.gravadoraNova).orElse(null);
    }

    LocalDate ano = entrada.getAnoLancamento();
    if (ano == null || ano.getYear() < ANO_MINIMO || ano.getYear() > ANO_MAXIMO) {
      erros.add("O ano deve estar entre 1900 e 2030 (RN0011).");
    }

    validarCategorias(entrada.getCategorias(), cadastro, erros);
    validarEdicoes(entrada.getEdicoes(), cadastro, erros);

    Formato formato = entrada.getFormato();
    if (formato == null || (formato.getId() == null && vazio(formato.getNome()))) {
      erros.add("Selecione o formato (RN0011).");
    } else {
      cadastro.formato = (formato.getId() != null
          ? formatoRepository.findById(formato.getId())
          : formatoRepository.findByNomeIgnoreCase(formato.getNome().trim())).orElse(null);
      if (cadastro.formato == null) {
        erros.add("Formato não registrado no sistema (RNF0013).");
      }
    }

    GrupoPrecificacao grupo = entrada.getGrupoPrecificacao();
    if (grupo == null || (grupo.getId() == null && vazio(grupo.getNome()))) {
      erros.add("Selecione o grupo de precificação (RN0013).");
    } else {
      cadastro.grupo = (grupo.getId() != null
          ? grupoPrecificacaoRepository.findById(grupo.getId())
          : grupoPrecificacaoRepository.findByNomeIgnoreCase(grupo.getNome().trim()))
          .orElse(null);
      if (cadastro.grupo == null) {
        erros.add("Grupo de precificação não registrado no sistema (RNF0013).");
      }
    }

    if (vazio(entrada.getCodigoCatalogo())) {
      erros.add("Informe o código de catálogo (RN0011).");
    }
    if (entrada.getCodigoBarras() == null || !entrada.getCodigoBarras().trim().matches("\\d{13}")) {
      erros.add("O código de barras deve ter 13 dígitos (RN0011).");
    }
    if (entrada.getNumeroFaixas() == null || entrada.getNumeroFaixas() <= 0) {
      erros.add("Informe o número de faixas (RN0011).");
    }
    if (vazio(entrada.getDescricao())) {
      erros.add("Informe a descrição (RN0011).");
    }
    if (vazio(entrada.getCapaUrl())) {
      erros.add("Informe a capa (URL ou caminho).");
    }
    if (!positivo(entrada.getAltura())) {
      erros.add("Informe a altura em cm (RN0011).");
    }
    if (!positivo(entrada.getLargura())) {
      erros.add("Informe a largura em cm (RN0011).");
    }
    if (!positivo(entrada.getProfundidade())) {
      erros.add("Informe a profundidade em cm (RN0011).");
    }
    if (entrada.getPeso() == null || entrada.getPeso() <= 0) {
      erros.add("Informe o peso em g (RN0011).");
    }
    return erros;
  }

  /** RN0012: ao menos um gênero, que precisa existir; estilo novo entra no domínio. */
  private void validarCategorias(Set<Categoria> informadas, Cadastro cadastro,
      List<String> erros) {
    boolean temGenero = false;
    for (Categoria informada : informadas == null ? Set.<Categoria>of() : informadas) {
      if (informada.getId() != null) {
        Optional<Categoria> encontrada = categoriaRepository.findById(informada.getId());
        if (encontrada.isEmpty()) {
          erros.add("Gênero " + informada.getId() + " não registrado no sistema (RNF0013).");
          temGenero = true;
        } else {
          temGenero = temGenero || Categoria.GENERO.equals(encontrada.get().getTipo());
          cadastro.categorias.add(encontrada.get());
        }
        continue;
      }
      if (vazio(informada.getDesc())) {
        continue;
      }
      String desc = informada.getDesc().trim();
      if (Categoria.ESTILO.equals(informada.getTipo())) {
        Optional<Categoria> estilo = categoriaRepository.findByDescIgnoreCaseAndTipo(desc,
            Categoria.ESTILO);
        if (estilo.isPresent()) {
          cadastro.categorias.add(estilo.get());
        } else {
          cadastro.estilosNovos.putIfAbsent(desc.toLowerCase(), desc);
        }
        continue;
      }
      temGenero = true;
      Optional<Categoria> genero = categoriaRepository.findByDescIgnoreCaseAndTipo(desc,
          Categoria.GENERO);
      if (genero.isPresent()) {
        cadastro.categorias.add(genero.get());
      } else {
        erros.add("Gênero " + desc + " não registrado no sistema (RNF0013).");
      }
    }
    if (!temGenero) {
      erros.add("Selecione ao menos um gênero (RN0012).");
    }
  }

  private void validarEdicoes(Set<Edicao> informadas, Cadastro cadastro, List<String> erros) {
    if (informadas == null || informadas.isEmpty()) {
      erros.add("Selecione ao menos uma edição (RN0011).");
      return;
    }
    for (Edicao informada : informadas) {
      Optional<Edicao> encontrada = Optional.empty();
      if (informada.getId() != null) {
        encontrada = edicaoRepository.findById(informada.getId());
      } else if (!vazio(informada.getNome())) {
        encontrada = edicaoRepository.findByNomeIgnoreCase(informada.getNome().trim());
      }
      if (encontrada.isEmpty()) {
        erros.add("Edição " + nomeOuId(informada.getNome(), informada.getId())
            + " não registrada no sistema (RNF0013).");
      } else {
        cadastro.edicoes.add(encontrada.get());
      }
    }
  }

  private void copiarCadastro(Disco origem, Disco destino, Cadastro cadastro) {
    destino.setTitulo(origem.getTitulo().trim());
    destino.setArtista(cadastro.artista != null ? cadastro.artista : novoArtista(cadastro));
    destino.setGravadora(
        cadastro.gravadora != null ? cadastro.gravadora : novaGravadora(cadastro));
    destino.setAnoLancamento(origem.getAnoLancamento());

    List<Categoria> categorias = new ArrayList<>(cadastro.categorias);
    for (String estilo : cadastro.estilosNovos.values()) {
      Categoria nova = new Categoria();
      nova.setDesc(estilo);
      nova.setTipo(Categoria.ESTILO);
      categorias.add(categoriaRepository.save(nova));
    }
    destino.getCategorias().clear();
    destino.getCategorias().addAll(categorias);
    destino.getEdicoes().clear();
    destino.getEdicoes().addAll(cadastro.edicoes);

    destino.setFormato(cadastro.formato);
    destino.setGrupoPrecificacao(cadastro.grupo);
    destino.setCodigoCatalogo(origem.getCodigoCatalogo().trim());
    destino.setCodigoBarras(origem.getCodigoBarras().trim());
    destino.setNumeroFaixas(origem.getNumeroFaixas());
    destino.setDuracao(vazio(origem.getDuracao()) ? null : origem.getDuracao().trim());
    destino.setDescricao(origem.getDescricao().trim());
    destino.setAltura(origem.getAltura());
    destino.setLargura(origem.getLargura());
    destino.setProfundidade(origem.getProfundidade());
    destino.setPeso(origem.getPeso());
    destino.setCapaUrl(origem.getCapaUrl().trim());
    destino.setCapaMiniaturaUrl(
        vazio(origem.getCapaMiniaturaUrl()) ? null : origem.getCapaMiniaturaUrl().trim());
  }

  private Artista novoArtista(Cadastro cadastro) {
    Artista artista = new Artista();
    artista.setNome(cadastro.artistaNovo);
    return artistaRepository.save(artista);
  }

  private Gravadora novaGravadora(Cadastro cadastro) {
    Gravadora gravadora = new Gravadora();
    gravadora.setNome(cadastro.gravadoraNova);
    return gravadoraRepository.save(gravadora);
  }

  // ------------------------------------------------------------------
  // Consulta
  // ------------------------------------------------------------------

  private Disco encontrar(Long id) {
    return id == null ? null : discoRepository.findById(id).orElse(null);
  }

  /** Os transientes da resposta, com uma consulta agregada para a lista inteira. */
  private void enriquecer(List<Disco> discos) {
    if (discos.isEmpty()) {
      return;
    }
    List<Long> ids = ids(discos);
    Map<Long, BigDecimal> custos = new HashMap<>();
    for (Object[] linha : discoRepository.maioresCustos(ids)) {
      custos.put((Long) linha[0], (BigDecimal) linha[1]);
    }
    Map<Long, LocalDateTime> vendas = ultimasVendas(ids);
    Map<Long, MotivoStatus> motivos = new HashMap<>();
    for (MotivoStatus motivo : discoRepository.motivosRecentes(ids)) {
      motivos.putIfAbsent(motivo.getDisco().getId(), motivo);
    }

    for (Disco disco : discos) {
      disco.setPrecoSugerido(
          RegrasPreco.sugerido(custos.get(disco.getId()), disco.getGrupoPrecificacao()));
      LocalDateTime venda = vendas.get(disco.getId());
      disco.setUltimaVendaEm(venda == null ? null : venda.toLocalDate());
      disco.setMotivoStatus(motivos.get(disco.getId()));
    }
  }

  private Map<Long, LocalDateTime> ultimasVendas(List<Long> ids) {
    Map<Long, LocalDateTime> vendas = new HashMap<>();
    if (ids.isEmpty()) {
      return vendas;
    }
    for (Object[] linha : discoRepository.ultimasVendas(ids)) {
      vendas.put((Long) linha[0], (LocalDateTime) linha[1]);
    }
    return vendas;
  }

  private void registrar(String operacao, Disco disco, MotivoStatus motivo, String usuario) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("codigo", disco.getCodigo());
    dados.put("titulo", disco.getTitulo());
    dados.put("artista", disco.getArtista().getNome());
    dados.put("precoVenda", disco.getPrecoVenda());
    dados.put("autorizacaoGerente", disco.getAutorizacaoGerente());
    dados.put("estoque", disco.getEstoque());
    dados.put("isAtivo", disco.getIsAtivo());
    if (motivo != null) {
      dados.put("categoriaStatus", motivo.getCategoria().getDesc());
      dados.put("justificativa", motivo.getJustificativa());
      dados.put("automatico", motivo.getAutomatico());
    }
    registradorLog.registrar(operacao, Disco.class.getSimpleName(), disco.getId(), dados,
        usuario);
  }

  private static List<Long> ids(List<Disco> discos) {
    return discos.stream().map(Disco::getId).toList();
  }

  private static String nomeOuId(String nome, Long id) {
    return vazio(nome) ? String.valueOf(id) : nome.trim();
  }

  private static boolean positivo(BigDecimal valor) {
    return valor != null && valor.signum() > 0;
  }

  private static boolean vazio(String valor) {
    return valor == null || valor.isBlank();
  }
}
