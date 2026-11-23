package br.com.rpm33.service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Cartao;
import br.com.rpm33.model.Categoria;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.ClienteFiltro;
import br.com.rpm33.model.Endereco;
import br.com.rpm33.model.Genero;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.model.Telefone;
import br.com.rpm33.model.TipoTelefone;
import br.com.rpm33.repository.CategoriaRepository;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.GeneroRepository;
import br.com.rpm33.repository.TipoTelefoneRepository;
import jakarta.persistence.EntityManager;

/**
 * Regras do cadastro de clientes. Nada disso vive no controlador nem na interface.
 */
@Service
public class ClienteService {

  private static final Pattern EMAIL = Pattern.compile("^\\S+@\\S+\\.\\S+$");

  private final ClienteRepository clienteRepository;
  private final GeneroRepository generoRepository;
  private final CategoriaRepository categoriaRepository;
  private final TipoTelefoneRepository tipoTelefoneRepository;
  private final RegrasEndereco regrasEndereco;
  private final RegrasCartao regrasCartao;
  private final RegistradorLog registradorLog;
  private final RegrasSenha regrasSenha;
  private final PasswordEncoder encoder;
  private final EntityManager entityManager;

  public ClienteService(ClienteRepository clienteRepository, GeneroRepository generoRepository,
      CategoriaRepository categoriaRepository, TipoTelefoneRepository tipoTelefoneRepository, RegrasEndereco regrasEndereco,
      RegrasCartao regrasCartao, RegistradorLog registradorLog, RegrasSenha regrasSenha,
      PasswordEncoder encoder, EntityManager entityManager) {
    this.clienteRepository = clienteRepository;
    this.generoRepository = generoRepository;
    this.categoriaRepository = categoriaRepository;
    this.tipoTelefoneRepository = tipoTelefoneRepository;
    this.regrasEndereco = regrasEndereco;
    this.regrasCartao = regrasCartao;
    this.registradorLog = registradorLog;
    this.regrasSenha = regrasSenha;
    this.encoder = encoder;
    this.entityManager = entityManager;
  }

  /** RF0021 */
  @Transactional
  public Cliente cadastrar(Cliente cliente) {
    normalizar(cliente);

    List<String> erros = validarDadosCadastrais(cliente, null);
    erros.addAll(regrasSenha.validar(cliente.getSenha(), cliente.getConfirmarSenha()));
    erros.addAll(validarEnderecos(cliente.getEnderecos()));
    erros.addAll(regrasCartao.validarCartoes(cliente.getCartoes()));
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }

    Cliente novo = new Cliente();
    copiarDadosCadastrais(cliente, novo, erros);
    substituirEnderecos(novo, cliente.getEnderecos(), erros);
    substituirCartoes(novo, cliente.getCartoes(), erros);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }

    novo.setCodigo(gerarCodigo());
    novo.setSenha(encoder.encode(cliente.getSenha()));
    novo.setRanking(0);
    novo.setIsAtivo(cliente.getIsAtivo() == null || cliente.getIsAtivo());

    Cliente salvo = clienteRepository.save(novo);
    registradorLog.registrar(OperacaoLog.INSERIR, salvo);
    return salvo;
  }

  /** RF0022: o cadastro inteiro; a senha só muda se vier preenchida. */
  @Transactional
  public Cliente alterar(Long id, Cliente entrada) {
    Cliente atual = encontrar(id);
    normalizar(entrada);

    List<String> erros = validarDadosCadastrais(entrada, atual.getId());
    if (entrada.getSenha() != null && !entrada.getSenha().isBlank()) {
      erros.addAll(regrasSenha.validar(entrada.getSenha(), entrada.getConfirmarSenha()));
    }
    erros.addAll(validarEnderecos(entrada.getEnderecos()));
    erros.addAll(regrasCartao.validarCartoes(entrada.getCartoes()));
    if (entrada.getCpf() != null && !entrada.getCpf().equals(atual.getCpf())) {
      erros.add("O CPF não pode ser alterado.");
    }
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }

    copiarDadosCadastrais(entrada, atual, erros);
    substituirEnderecos(atual, entrada.getEnderecos(), erros);
    substituirCartoes(atual, entrada.getCartoes(), erros);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    if (entrada.getSenha() != null && !entrada.getSenha().isBlank()) {
      atual.setSenha(encoder.encode(entrada.getSenha()));
    }
    if (entrada.getIsAtivo() != null) {
      atual.setIsAtivo(entrada.getIsAtivo());
    }

    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return atual;
  }

  /** RF0028: trocar a senha sem editar o resto do cadastro. */
  @Transactional
  public Cliente alterarSenha(Long id, String senha, String confirmarSenha) {
    Cliente atual = encontrar(id);
    List<String> erros = regrasSenha.validar(senha, confirmarSenha);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    atual.setSenha(encoder.encode(senha));
    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return atual;
  }

  /** RNF0034: alterar ou adicionar endereços sem editar o resto do cadastro. */
  @Transactional
  public Cliente alterarEnderecos(Long id, Collection<Endereco> enderecos) {
    Cliente atual = encontrar(id);
    normalizarEnderecos(enderecos);
    List<String> erros = validarEnderecos(enderecos);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    substituirEnderecos(atual, enderecos, erros);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return atual;
  }

  /** RF0036: cartão novo do checkout incorporado ao perfil, sem editar o cadastro. */
  @Transactional
  public Cliente alterarCartoes(Long id, Collection<Cartao> cartoes) {
    Cliente atual = encontrar(id);
    normalizarCartoes(cartoes);
    List<String> erros = regrasCartao.validarCartoes(cartoes);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    substituirCartoes(atual, cartoes, erros);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return atual;
  }

  /**
   * RNF0044: gêneros e estilos preferidos, declarados pelo cliente (decisão do grupo). O
   * assistente os soma ao histórico de compras; nenhum é obrigatório.
   */
  @Transactional
  public Cliente alterarPreferencias(Long id, Collection<Categoria> preferencias) {
    Cliente atual = encontrar(id);
    Set<Categoria> escolhidas = new LinkedHashSet<>();
    for (Categoria informada : preferencias == null ? List.<Categoria>of() : preferencias) {
      Optional<Categoria> categoria = informada.getId() == null ? Optional.empty()
          : categoriaRepository.findById(informada.getId());
      if (categoria.isEmpty()) {
        throw new RegraNegocioException("Escolha gêneros e estilos do acervo.");
      }
      escolhidas.add(categoria.get());
    }
    atual.getPreferencias().clear();
    atual.getPreferencias().addAll(escolhidas);
    registradorLog.registrar(OperacaoLog.ALTERAR, atual, atual.getEmail());
    return atual;
  }

  /** A reativação do cadastro. */
  @Transactional
  public Cliente ativar(Long id) {
    Cliente atual = encontrar(id);
    atual.setIsAtivo(true);
    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return atual;
  }

  /**
   * RF0023. Cliente não é apagado: o DRS só prevê inativação e as chaves de pedido e cupom
   * impedem a exclusão física de quem já tem histórico.
   */
  @Transactional
  public Cliente inativar(Long id) {
    Cliente atual = encontrar(id);
    atual.setIsAtivo(false);
    registradorLog.registrar(OperacaoLog.EXCLUIR, atual);
    return atual;
  }

  /** RF0024 */
  @Transactional(readOnly = true)
  public List<Cliente> consultar(ClienteFiltro filtro) {
    return clienteRepository.findAll(ClienteSpecs.de(filtro), Sort.by("nome"));
  }

  /** A carga do formulário. */
  @Transactional(readOnly = true)
  public Optional<Cliente> buscar(Long id) {
    return clienteRepository.findById(id);
  }

  /** Autenticação simples: e-mail e senha conferidos contra o hash guardado. */
  @Transactional(readOnly = true)
  public Cliente autenticar(String email, String senha) {
    if (email == null || senha == null) {
      throw new AutenticacaoException("Informe e-mail e senha.");
    }
    Optional<Cliente> encontrado = clienteRepository.findByEmailIgnoreCase(email);
    if (encontrado.isEmpty() || !encoder.matches(senha, encontrado.get().getSenha())) {
      throw new AutenticacaoException("E-mail ou senha inválidos.");
    }
    Cliente cliente = encontrado.get();
    if (Boolean.FALSE.equals(cliente.getIsAtivo())) {
      throw new AutenticacaoException("Cadastro inativo. Procure a curadoria.");
    }
    return cliente;
  }

  private Cliente encontrar(Long id) {
    return clienteRepository.findById(id)
        .orElseThrow(() -> new RegraNegocioException("Cliente não encontrado."));
  }

  // ------------------------------------------------------------------
  // Validação
  // ------------------------------------------------------------------

  /** RN0026: gênero, nome, data de nascimento, CPF, telefone, e-mail e senha. */
  private List<String> validarDadosCadastrais(Cliente cliente, Long idAtual) {
    List<String> erros = new ArrayList<>();

    if (vazio(cliente.getNome()) || cliente.getNome().trim().length() < 3) {
      erros.add("O nome deve ter pelo menos 3 letras.");
    }
    if (vazio(cliente.getEmail()) || !EMAIL.matcher(cliente.getEmail()).matches()) {
      erros.add("Informe um e-mail válido.");
    } else if (emailEmUso(cliente.getEmail(), idAtual)) {
      erros.add("Já existe um cliente com este e-mail.");
    }
    if (cliente.getCpf() == null || cliente.getCpf().length() != 11) {
      erros.add("CPF inválido: informe 11 dígitos.");
    } else if (cpfEmUso(cliente.getCpf(), idAtual)) {
      erros.add("Já existe um cliente com este CPF.");
    }
    if (cliente.getDataNascimento() == null) {
      erros.add("Informe a data de nascimento.");
    }
    if (cliente.getGenero() == null
        || (cliente.getGenero().getId() == null && vazio(cliente.getGenero().getDesc()))) {
      erros.add("Selecione um gênero.");
    }
    erros.addAll(validarTelefone(cliente.getTelefone()));
    return erros;
  }

  /** RN0026: o telefone é composto por tipo, DDD e número. */
  private List<String> validarTelefone(Telefone telefone) {
    List<String> erros = new ArrayList<>();
    if (telefone == null) {
      erros.add("Informe o telefone com tipo, DDD e número.");
      return erros;
    }
    if (telefone.getTipo() == null
        || (telefone.getTipo().getId() == null && vazio(telefone.getTipo().getDesc()))) {
      erros.add("Selecione o tipo do telefone.");
    }
    if (telefone.getDdd() == null || telefone.getDdd().length() != 2) {
      erros.add("DDD inválido.");
    }
    if (telefone.getNumero() == null
        || (telefone.getNumero().length() != 8 && telefone.getNumero().length() != 9)) {
      erros.add("Número de telefone inválido.");
    }
    return erros;
  }

  /** RNF0031 e RNF0032. */
  /** RN0021, RN0022 e RN0023. */
  private List<String> validarEnderecos(Collection<Endereco> enderecos) {
    List<String> erros = new ArrayList<>();
    if (enderecos.isEmpty()) {
      erros.add("O cliente precisa de ao menos um endereço de cobrança.");
      erros.add("O cliente precisa de ao menos um endereço de entrega.");
      return erros;
    }

    for (Endereco endereco : enderecos) {
      erros.addAll(regrasEndereco.validar(endereco));
    }

    if (!temEnderecoDe(enderecos, Endereco.COBRANCA)) {
      erros.add("O cliente precisa de ao menos um endereço de cobrança.");
    }
    if (!temEnderecoDe(enderecos, Endereco.ENTREGA)) {
      erros.add("O cliente precisa de ao menos um endereço de entrega.");
    }
    return erros;
  }

  private static boolean temEnderecoDe(Collection<Endereco> enderecos, String tipo) {
    return enderecos.stream().anyMatch(endereco -> endereco.atende(tipo));
  }

  private boolean emailEmUso(String email, Long idAtual) {
    return idAtual == null ? clienteRepository.existsByEmailIgnoreCase(email)
        : clienteRepository.existsByEmailIgnoreCaseAndIdNot(email, idAtual);
  }

  private boolean cpfEmUso(String cpf, Long idAtual) {
    return idAtual == null ? clienteRepository.existsByCpf(cpf)
        : clienteRepository.existsByCpfAndIdNot(cpf, idAtual);
  }

  // ------------------------------------------------------------------
  // Montagem do agregado
  // ------------------------------------------------------------------

  private void copiarDadosCadastrais(Cliente origem, Cliente destino, List<String> erros) {
    destino.setNome(origem.getNome().trim());
    destino.setEmail(origem.getEmail().trim());
    destino.setCpf(origem.getCpf());
    destino.setDataNascimento(origem.getDataNascimento());
    destino.setGenero(resolverGenero(origem.getGenero(), erros));

    Telefone telefone = destino.getTelefone();
    if (telefone == null) {
      telefone = new Telefone();
      telefone.setCliente(destino);
      destino.setTelefone(telefone);
    }
    telefone.setTipo(resolverTipoTelefone(origem.getTelefone().getTipo(), erros));
    telefone.setDdd(origem.getTelefone().getDdd());
    telefone.setNumero(origem.getTelefone().getNumero());
  }

  /**
   * Monta primeiro e só depois troca a coleção: um domínio não resolvido precisa
   * virar mensagem de negócio, não violação de constraint no commit.
   */
  private void substituirEnderecos(Cliente destino, Iterable<Endereco> novos, List<String> erros) {
    List<Endereco> enderecos = new ArrayList<>();
    for (Endereco entrada : novos) {
      Endereco endereco = new Endereco();
      endereco.setCliente(destino);
      endereco.setNome(entrada.getNome().trim());
      endereco.setTipo(entrada.getTipo());
      endereco.setTipoResidencia(entrada.getTipoResidencia());
      endereco.setTipoLogradouro(entrada.getTipoLogradouro());
      endereco.setLogradouro(entrada.getLogradouro().trim());
      endereco.setNumero(entrada.getNumero().trim());
      endereco.setBairro(entrada.getBairro().trim());
      endereco.setCep(entrada.getCep());
      endereco.setPais(entrada.getPais().trim());
      endereco.setObservacoes(entrada.getObservacoes());
      endereco.setCidade(regrasEndereco.resolverCidade(entrada.getCidade(), erros));
      enderecos.add(endereco);
    }
    if (!erros.isEmpty()) {
      return;
    }

    // o flush garante que os DELETE saiam antes dos INSERT
    destino.getEnderecos().clear();
    entityManager.flush();
    destino.getEnderecos().addAll(enderecos);
  }

  private void substituirCartoes(Cliente destino, Iterable<Cartao> novos, List<String> erros) {
    boolean jaTemPreferencial = false;
    List<Cartao> cartoes = new ArrayList<>();
    for (Cartao entrada : novos) {
      Cartao cartao = new Cartao();
      cartao.setCliente(destino);
      cartao.setNumero(entrada.getNumero());
      cartao.setNomeImpresso(entrada.getNomeImpresso().trim());
      cartao.setCodigoSeguranca(entrada.getCodigoSeguranca());
      cartao.setBandeira(regrasCartao.resolverBandeira(entrada.getBandeira(), erros));
      // RF0027: exatamente um preferencial, mesmo que a interface mande zero ou vários
      boolean preferencial = Boolean.TRUE.equals(entrada.getIsPreferencial()) && !jaTemPreferencial;
      jaTemPreferencial = jaTemPreferencial || preferencial;
      cartao.setIsPreferencial(preferencial);
      cartoes.add(cartao);
    }
    if (!erros.isEmpty()) {
      return;
    }
    if (!cartoes.isEmpty() && !jaTemPreferencial) {
      cartoes.get(0).setIsPreferencial(true);
    }

    destino.getCartoes().clear();
    entityManager.flush();
    destino.getCartoes().addAll(cartoes);
  }

  private Genero resolverGenero(Genero informado, List<String> erros) {
    if (informado == null) {
      return null;
    }
    Optional<Genero> encontrado = informado.getId() != null
        ? generoRepository.findById(informado.getId())
        : generoRepository.findByDescIgnoreCase(informado.getDesc().trim());
    if (encontrado.isEmpty()) {
      erros.add("Gênero não registrado no sistema.");
      return null;
    }
    return encontrado.get();
  }

  private TipoTelefone resolverTipoTelefone(TipoTelefone informado, List<String> erros) {
    if (informado == null) {
      return null;
    }
    Optional<TipoTelefone> encontrado = informado.getId() != null
        ? tipoTelefoneRepository.findById(informado.getId())
        : tipoTelefoneRepository.findByDescIgnoreCase(informado.getDesc().trim());
    if (encontrado.isEmpty()) {
      erros.add("Tipo de telefone não registrado no sistema.");
      return null;
    }
    return encontrado.get();
  }

  /** RNF0035. */
  private String gerarCodigo() {
    return "CLI-%06d".formatted(clienteRepository.proximoNumeroDeCodigo());
  }

  // ------------------------------------------------------------------
  // Normalização
  // ------------------------------------------------------------------

  private void normalizar(Cliente cliente) {
    cliente.setCpf(apenasDigitos(cliente.getCpf()));
    if (cliente.getTelefone() != null) {
      cliente.getTelefone().setDdd(apenasDigitos(cliente.getTelefone().getDdd()));
      cliente.getTelefone().setNumero(apenasDigitos(cliente.getTelefone().getNumero()));
    }
    normalizarEnderecos(cliente.getEnderecos());
    normalizarCartoes(cliente.getCartoes());
  }

  private static void normalizarEnderecos(Collection<Endereco> enderecos) {
    for (Endereco endereco : enderecos) {
      endereco.setCep(apenasDigitos(endereco.getCep()));
    }
  }

  private static void normalizarCartoes(Collection<Cartao> cartoes) {
    for (Cartao cartao : cartoes) {
      cartao.setNumero(apenasDigitos(cartao.getNumero()));
      cartao.setCodigoSeguranca(apenasDigitos(cartao.getCodigoSeguranca()));
    }
  }

  private static String apenasDigitos(String valor) {
    return valor == null ? null : valor.replaceAll("\\D", "");
  }

  private static boolean vazio(String valor) {
    return valor == null || valor.isBlank();
  }
}
