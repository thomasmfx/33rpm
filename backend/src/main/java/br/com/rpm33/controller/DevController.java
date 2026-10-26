package br.com.rpm33.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import tools.jackson.databind.ObjectMapper;

import br.com.rpm33.model.BandeiraCartao;
import br.com.rpm33.model.Cartao;
import br.com.rpm33.model.Cidade;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.Cupom;
import br.com.rpm33.model.Endereco;
import br.com.rpm33.model.Estado;
import br.com.rpm33.model.Genero;
import br.com.rpm33.model.Log;
import br.com.rpm33.model.Telefone;
import br.com.rpm33.model.TipoCupom;
import br.com.rpm33.model.TipoTelefone;
import br.com.rpm33.repository.CupomRepository;
import br.com.rpm33.repository.ItemCarrinhoRepository;
import br.com.rpm33.repository.LogRepository;
import br.com.rpm33.repository.TipoCupomRepository;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;
import jakarta.persistence.EntityManager;

/**
 * Recarrega a massa de dados que os testes de interface esperam. Só existe no
 * perfil dev — nunca sobe junto com uma execução de produção.
 */
@RestController
@RequestMapping("/api/dev")
@Profile("dev")
public class DevController {

  public static final String SENHA_PADRAO = "Senha@123";

  private final IFachada fachada;
  private final CargaAcervo cargaAcervo;
  private final CupomRepository cupomRepository;
  private final TipoCupomRepository tipoCupomRepository;
  private final ItemCarrinhoRepository itemCarrinhoRepository;
  private final LogRepository logRepository;
  private final ObjectMapper objectMapper;
  private final EntityManager entityManager;

  public DevController(IFachada fachada, CargaAcervo cargaAcervo,
      CupomRepository cupomRepository, TipoCupomRepository tipoCupomRepository,
      ItemCarrinhoRepository itemCarrinhoRepository, LogRepository logRepository,
      ObjectMapper objectMapper, EntityManager entityManager) {
    this.fachada = fachada;
    this.cargaAcervo = cargaAcervo;
    this.cupomRepository = cupomRepository;
    this.tipoCupomRepository = tipoCupomRepository;
    this.itemCarrinhoRepository = itemCarrinhoRepository;
    this.logRepository = logRepository;
    this.objectMapper = objectMapper;
    this.entityManager = entityManager;
  }

  /** Três clientes, o acervo inteiro pela Fachada e os cupons da Ana e do Bruno. */
  @PostMapping("/reset")
  @Transactional
  public ResponseEntity<Object> reset() {
    entityManager.createNativeQuery("TRUNCATE cliente, disco, log RESTART IDENTITY CASCADE")
        .executeUpdate();
    entityManager.createNativeQuery("ALTER SEQUENCE seq_codigo_cliente RESTART WITH 1")
        .executeUpdate();
    entityManager.createNativeQuery("ALTER SEQUENCE seq_codigo_disco RESTART WITH 1")
        .executeUpdate();

    List<String> falhas = new ArrayList<>();
    Cliente ana = inserir(anaPaula(), 5, falhas);
    Cliente bruno = inserir(brunoTavares(), 3, falhas);
    inserir(carlaNogueira(), 1, falhas);
    falhas.addAll(cargaAcervo.carregar());

    if (!falhas.isEmpty()) {
      return ResponseEntity.internalServerError().body(falhas);
    }
    inserirCupons(ana, bruno);
    return ResponseEntity.ok(List.of("CLI-000001", "CLI-000002", "CLI-000003"));
  }

  /**
   * RN0044: o carrinho do cliente fica como se os minutos tivessem passado desde cada
   * inclusão, para a expiração ser demonstrada sem esperar o prazo.
   */
  @PostMapping("/carrinhos/{clienteId}/envelhecer")
  @Transactional
  public ResponseEntity<Object> envelhecerCarrinho(@PathVariable Long clienteId,
      @RequestParam int minutos) {
    return ResponseEntity.ok(Map.of("itens", itemCarrinhoRepository.envelhecer(clienteId, minutos)));
  }

  /** RNF0012: o log de transações, do mais recente para o mais antigo. */
  @GetMapping("/logs")
  @Transactional(readOnly = true)
  public List<Map<String, Object>> logs(@RequestParam(required = false) String entidade,
      @RequestParam(required = false) Long entidadeId) {
    Log exemplo = new Log();
    exemplo.setEntidade(entidade);
    exemplo.setEntidadeId(entidadeId);
    return logRepository.findAll(Example.of(exemplo), Sort.by(Sort.Direction.DESC, "id"))
        .stream().map(this::paraResposta).toList();
  }

  private Map<String, Object> paraResposta(Log log) {
    Map<String, Object> resposta = new LinkedHashMap<>();
    resposta.put("id", log.getId());
    resposta.put("operacao", log.getOperacao().getDescricao());
    resposta.put("entidade", log.getEntidade());
    resposta.put("entidadeId", log.getEntidadeId());
    resposta.put("usuario", log.getUsuario());
    resposta.put("dataHora", log.getDataHora());
    resposta.put("dadosAlterados", objectMapper.readTree(log.getDadosAlterados()));
    return resposta;
  }

  private Cliente inserir(Cliente cliente, int ranking, List<String> falhas) {
    Resultado resultado = fachada.inserir(cliente);
    if (resultado.temErro()) {
      falhas.addAll(resultado.getMensagens());
      return null;
    }
    Cliente salvo = (Cliente) resultado.primeira();
    if (!Boolean.TRUE.equals(cliente.getIsAtivo())) {
      salvo.setIsAtivo(false);
    }
    salvo.setRanking(ranking);
    return salvo;
  }

  /**
   * Única carga direta de dado de negócio, a mesma de db/cupons.sql: os cupons com que a
   * demonstração começa. Os gerados pela troca (RF0045) e pela sobra (RN0036) nascem das
   * próprias operações.
   */
  private void inserirCupons(Cliente ana, Cliente bruno) {
    TipoCupom troca = tipoCupomRepository.findByDescIgnoreCase(TipoCupom.TROCA).orElseThrow();
    TipoCupom promocional =
        tipoCupomRepository.findByDescIgnoreCase(TipoCupom.PROMOCIONAL).orElseThrow();
    cupomRepository.saveAll(List.of(
        cupom(ana, troca, "TROCA-AP-300", "300.00"),
        cupom(ana, troca, "TROCA-AP-045", "45.00"),
        cupom(ana, promocional, "PROMO-AP-20", "20.00"),
        cupom(ana, promocional, "PROMO-AP-50", "50.00"),
        cupom(bruno, troca, "TROCA-BT-120", "120.00"),
        cupom(bruno, promocional, "PROMO-BT-30", "30.00"),
        cupom(bruno, promocional, "PROMO-BT-280", "280.00")));
  }

  private Cupom cupom(Cliente cliente, TipoCupom tipo, String codigo, String valor) {
    Cupom cupom = new Cupom();
    cupom.setCliente(cliente);
    cupom.setClienteId(cliente.getId());
    cupom.setTipo(tipo);
    cupom.setCodigo(codigo);
    cupom.setValor(new BigDecimal(valor));
    cupom.setIsUtilizado(false);
    return cupom;
  }

  private Cliente anaPaula() {
    Cliente cliente = base("Ana Paula Ribeiro", "ana.ribeiro@email.com", "12345678901",
        LocalDate.of(1991, 3, 14), "Feminino", true);
    cliente.setTelefone(telefone("Celular", "11", "987654321", cliente));
    cliente.getEnderecos()
        .add(endereco(cliente, "Casa", Endereco.AMBOS, "São Paulo", "SP", "05422030"));
    cliente.getCartoes().add(cartao(cliente, "Visa", "4539781234561002", "ANA P RIBEIRO", "123"));
    return cliente;
  }

  private Cliente brunoTavares() {
    Cliente cliente = base("Bruno Tavares", "bruno.tavares@email.com", "98765432100",
        LocalDate.of(1985, 7, 2), "Masculino", true);
    cliente.setTelefone(telefone("Residencial", "21", "32567890", cliente));
    cliente.getEnderecos()
        .add(endereco(cliente, "Apartamento", Endereco.AMBOS, "Rio de Janeiro", "RJ", "22071900"));
    return cliente;
  }

  private Cliente carlaNogueira() {
    Cliente cliente = base("Carla Nogueira", "carla.nogueira@email.com", "45678912300",
        LocalDate.of(1998, 11, 30), "Feminino", false);
    cliente.setTelefone(telefone("Celular", "31", "991234567", cliente));
    cliente.getEnderecos()
        .add(endereco(cliente, "Casa da praia", Endereco.AMBOS, "Belo Horizonte", "MG", "30130010"));
    return cliente;
  }

  private Cliente base(String nome, String email, String cpf, LocalDate nascimento,
      String descGenero, boolean ativo) {
    Cliente cliente = new Cliente();
    cliente.setNome(nome);
    cliente.setEmail(email);
    cliente.setCpf(cpf);
    cliente.setDataNascimento(nascimento);
    cliente.setSenha(SENHA_PADRAO);
    cliente.setConfirmarSenha(SENHA_PADRAO);
    cliente.setIsAtivo(ativo);
    Genero genero = new Genero();
    genero.setDesc(descGenero);
    cliente.setGenero(genero);
    return cliente;
  }

  private Telefone telefone(String tipoDesc, String ddd, String numero, Cliente cliente) {
    TipoTelefone tipo = new TipoTelefone();
    tipo.setDesc(tipoDesc);
    Telefone telefone = new Telefone();
    telefone.setTipo(tipo);
    telefone.setDdd(ddd);
    telefone.setNumero(numero);
    telefone.setCliente(cliente);
    return telefone;
  }

  private Endereco endereco(Cliente cliente, String nome, String tipo, String nomeCidade,
      String uf, String cep) {
    Estado estado = new Estado();
    estado.setDesc(uf);
    Cidade cidade = new Cidade();
    cidade.setDesc(nomeCidade);
    cidade.setEstado(estado);

    Endereco endereco = new Endereco();
    endereco.setCliente(cliente);
    endereco.setNome(nome);
    endereco.setTipo(tipo);
    endereco.setTipoResidencia("Casa");
    endereco.setTipoLogradouro("Rua");
    endereco.setLogradouro("das Palmeiras");
    endereco.setNumero("120");
    endereco.setBairro("Centro");
    endereco.setCep(cep);
    endereco.setPais("Brasil");
    endereco.setCidade(cidade);
    return endereco;
  }

  private Cartao cartao(Cliente cliente, String bandeiraDesc, String numero, String nomeImpresso,
      String cvv) {
    BandeiraCartao bandeira = new BandeiraCartao();
    bandeira.setDesc(bandeiraDesc);
    Cartao cartao = new Cartao();
    cartao.setCliente(cliente);
    cartao.setBandeira(bandeira);
    cartao.setNumero(numero);
    cartao.setNomeImpresso(nomeImpresso);
    cartao.setCodigoSeguranca(cvv);
    cartao.setIsPreferencial(true);
    return cartao;
  }
}
