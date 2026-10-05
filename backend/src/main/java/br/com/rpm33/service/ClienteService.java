package br.com.rpm33.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Cartao;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.ClienteFiltro;
import br.com.rpm33.model.Endereco;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.model.Genero;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.model.Telefone;
import br.com.rpm33.model.TipoTelefone;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.GeneroRepository;
import br.com.rpm33.repository.TipoTelefoneRepository;
import jakarta.persistence.EntityManager;

/**
 * Regras do cadastro de clientes. Nada disso vive no controlador nem na interface.
 */
@Service("Cliente")
public class ClienteService implements IService {

  private static final Pattern EMAIL = Pattern.compile("^\\S+@\\S+\\.\\S+$");

  private final ClienteRepository clienteRepository;
  private final GeneroRepository generoRepository;
  private final TipoTelefoneRepository tipoTelefoneRepository;
  private final RegrasEndereco regrasEndereco;
  private final RegrasCartao regrasCartao;
  private final RegistradorLog registradorLog;
  private final RegrasSenha regrasSenha;
  private final PasswordEncoder encoder;
  private final EntityManager entityManager;

  public ClienteService(ClienteRepository clienteRepository, GeneroRepository generoRepository,
      TipoTelefoneRepository tipoTelefoneRepository, RegrasEndereco regrasEndereco,
      RegrasCartao regrasCartao, RegistradorLog registradorLog, RegrasSenha regrasSenha,
      PasswordEncoder encoder, EntityManager entityManager) {
    this.clienteRepository = clienteRepository;
    this.generoRepository = generoRepository;
    this.tipoTelefoneRepository = tipoTelefoneRepository;
    this.regrasEndereco = regrasEndereco;
    this.regrasCartao = regrasCartao;
    this.registradorLog = registradorLog;
    this.regrasSenha = regrasSenha;
    this.encoder = encoder;
    this.entityManager = entityManager;
  }

  /** RF0021 */
  @Override
  @Transactional
  public Resultado salvar(EntidadeDominio entidade) {
    Cliente cliente = (Cliente) entidade;
    normalizar(cliente);

    List<String> erros = validarDadosCadastrais(cliente, null);
    erros.addAll(regrasSenha.validar(cliente.getSenha(), cliente.getConfirmarSenha()));
    erros.addAll(validarEnderecos(cliente));
    erros.addAll(regrasCartao.validarCartoes(cliente.getCartoes()));
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }

    Cliente novo = new Cliente();
    copiarDadosCadastrais(cliente, novo, erros);
    substituirEnderecos(novo, cliente.getEnderecos(), erros);
    substituirCartoes(novo, cliente.getCartoes(), erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }

    novo.setCodigo(gerarCodigo());
    novo.setSenha(encoder.encode(cliente.getSenha()));
    novo.setRanking(0);
    novo.setIsAtivo(cliente.getIsAtivo() == null || cliente.getIsAtivo());

    Cliente salvo = clienteRepository.save(novo);
    registradorLog.registrar(OperacaoLog.INSERIR, salvo);
    return Resultado.com(salvo);
  }

  /** RF0022, RF0028, RNF0034 e a reativação do cadastro. */
  @Override
  @Transactional
  public Resultado alterar(EntidadeDominio entidade) {
    Cliente entrada = (Cliente) entidade;
    Optional<Cliente> encontrado = clienteRepository.findById(entrada.getId());
    if (encontrado.isEmpty()) {
      return Resultado.erro("Cliente não encontrado.");
    }
    Cliente atual = encontrado.get();
    normalizar(entrada);

    if (apenasSenha(entrada)) {
      return alterarSenha(atual, entrada);
    }
    if (apenasEnderecos(entrada)) {
      return alterarEnderecos(atual, entrada);
    }
    if (apenasCartoes(entrada)) {
      return alterarCartoes(atual, entrada);
    }
    if (apenasStatus(entrada)) {
      atual.setIsAtivo(entrada.getIsAtivo());
      registradorLog.registrar(OperacaoLog.ALTERAR, atual);
      return Resultado.com(atual);
    }

    List<String> erros = validarDadosCadastrais(entrada, atual.getId());
    if (entrada.getSenha() != null && !entrada.getSenha().isBlank()) {
      erros.addAll(regrasSenha.validar(entrada.getSenha(), entrada.getConfirmarSenha()));
    }
    erros.addAll(validarEnderecos(entrada));
    erros.addAll(regrasCartao.validarCartoes(entrada.getCartoes()));
    if (entrada.getCpf() != null && !entrada.getCpf().equals(atual.getCpf())) {
      erros.add("O CPF não pode ser alterado.");
    }
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }

    copiarDadosCadastrais(entrada, atual, erros);
    substituirEnderecos(atual, entrada.getEnderecos(), erros);
    substituirCartoes(atual, entrada.getCartoes(), erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }
    if (entrada.getSenha() != null && !entrada.getSenha().isBlank()) {
      atual.setSenha(encoder.encode(entrada.getSenha()));
    }
    if (entrada.getIsAtivo() != null) {
      atual.setIsAtivo(entrada.getIsAtivo());
    }

    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return Resultado.com(atual);
  }

  /** RF0024 pelo filtro, carga do formulário pelo id, autenticação por e-mail e senha. */
  @Override
  @Transactional(readOnly = true)
  public Resultado consultar(EntidadeDominio entidade) {
    if (entidade instanceof ClienteFiltro filtro) {
      List<Cliente> encontrados =
          clienteRepository.findAll(ClienteSpecs.de(filtro), Sort.by("nome"));
      return Resultado.de(encontrados);
    }

    Cliente cliente = (Cliente) entidade;
    if (cliente.getId() != null) {
      return clienteRepository.findById(cliente.getId())
          .map(Resultado::com)
          .orElseGet(() -> Resultado.erro("Cliente não encontrado."));
    }
    if (cliente.getEmail() != null && cliente.getSenha() != null) {
      return autenticar(cliente.getEmail(), cliente.getSenha());
    }
    return Resultado.de(clienteRepository.findAll(Sort.by("nome")));
  }

  /**
   * RF0023. Cliente não é apagado: o DRS só prevê inativação e as chaves de pedido e cupom
   * impedem a exclusão física de quem já tem histórico.
   */
  @Override
  @Transactional
  public Resultado excluir(EntidadeDominio entidade) {
    Cliente entrada = (Cliente) entidade;
    Optional<Cliente> encontrado = clienteRepository.findById(entrada.getId());
    if (encontrado.isEmpty()) {
      return Resultado.erro("Cliente não encontrado.");
    }
    Cliente atual = encontrado.get();
    atual.setIsAtivo(false);
    registradorLog.registrar(OperacaoLog.EXCLUIR, atual);
    return Resultado.com(atual);
  }

  // ------------------------------------------------------------------
  // Alterações parciais
  // ------------------------------------------------------------------

  /** RF0028: trocar a senha sem editar o resto do cadastro. */
  private Resultado alterarSenha(Cliente atual, Cliente entrada) {
    List<String> erros = regrasSenha.validar(entrada.getSenha(), entrada.getConfirmarSenha());
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }
    atual.setSenha(encoder.encode(entrada.getSenha()));
    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return Resultado.com(atual);
  }

  /** RNF0034: alterar ou adicionar endereços sem editar o resto do cadastro. */
  private Resultado alterarEnderecos(Cliente atual, Cliente entrada) {
    List<String> erros = validarEnderecos(entrada);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }
    substituirEnderecos(atual, entrada.getEnderecos(), erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }
    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return Resultado.com(atual);
  }

  /** RF0036: cartão novo do checkout incorporado ao perfil, sem editar o cadastro. */
  private Resultado alterarCartoes(Cliente atual, Cliente entrada) {
    List<String> erros = regrasCartao.validarCartoes(entrada.getCartoes());
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }
    substituirCartoes(atual, entrada.getCartoes(), erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }
    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return Resultado.com(atual);
  }

  private Resultado autenticar(String email, String senha) {
    Optional<Cliente> encontrado = clienteRepository.findByEmailIgnoreCase(email);
    if (encontrado.isEmpty() || !encoder.matches(senha, encontrado.get().getSenha())) {
      return Resultado.erro("E-mail ou senha inválidos.");
    }
    Cliente cliente = encontrado.get();
    if (Boolean.FALSE.equals(cliente.getIsAtivo())) {
      return Resultado.erro("Cadastro inativo. Procure a curadoria.");
    }
    return Resultado.com(cliente);
  }

  private boolean apenasSenha(Cliente entrada) {
    return entrada.getSenha() != null && entrada.getNome() == null
        && entrada.getEnderecos().isEmpty() && entrada.getCartoes().isEmpty();
  }

  private boolean apenasEnderecos(Cliente entrada) {
    return entrada.getNome() == null && entrada.getSenha() == null
        && !entrada.getEnderecos().isEmpty();
  }

  private boolean apenasCartoes(Cliente entrada) {
    return entrada.getNome() == null && entrada.getSenha() == null
        && entrada.getEnderecos().isEmpty() && !entrada.getCartoes().isEmpty();
  }

  private boolean apenasStatus(Cliente entrada) {
    return entrada.getIsAtivo() != null && entrada.getNome() == null && entrada.getSenha() == null
        && entrada.getEnderecos().isEmpty() && entrada.getCartoes().isEmpty();
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
      erros.add("Informe a data de nascimento (RN0026).");
    }
    if (cliente.getGenero() == null
        || (cliente.getGenero().getId() == null && vazio(cliente.getGenero().getDesc()))) {
      erros.add("Selecione um gênero (RN0026).");
    }
    erros.addAll(validarTelefone(cliente.getTelefone()));
    return erros;
  }

  /** RN0026: o telefone é composto por tipo, DDD e número. */
  private List<String> validarTelefone(Telefone telefone) {
    List<String> erros = new ArrayList<>();
    if (telefone == null) {
      erros.add("Informe o telefone com tipo, DDD e número (RN0026).");
      return erros;
    }
    if (telefone.getTipo() == null
        || (telefone.getTipo().getId() == null && vazio(telefone.getTipo().getDesc()))) {
      erros.add("Selecione o tipo do telefone (RN0026).");
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
  private List<String> validarEnderecos(Cliente cliente) {
    List<String> erros = new ArrayList<>();
    if (cliente.getEnderecos().isEmpty()) {
      erros.add("O cliente precisa de ao menos um endereço de cobrança (RN0021).");
      erros.add("O cliente precisa de ao menos um endereço de entrega (RN0022).");
      return erros;
    }

    for (Endereco endereco : cliente.getEnderecos()) {
      erros.addAll(regrasEndereco.validar(endereco));
    }

    if (!temEnderecoDe(cliente, Endereco.COBRANCA)) {
      erros.add("O cliente precisa de ao menos um endereço de cobrança (RN0021).");
    }
    if (!temEnderecoDe(cliente, Endereco.ENTREGA)) {
      erros.add("O cliente precisa de ao menos um endereço de entrega (RN0022).");
    }
    return erros;
  }

  private boolean temEnderecoDe(Cliente cliente, String tipo) {
    return cliente.getEnderecos().stream().anyMatch(endereco -> endereco.atende(tipo));
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
    for (Endereco endereco : cliente.getEnderecos()) {
      endereco.setCep(apenasDigitos(endereco.getCep()));
    }
    for (Cartao cartao : cliente.getCartoes()) {
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
