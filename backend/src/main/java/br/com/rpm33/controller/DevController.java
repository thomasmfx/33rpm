package br.com.rpm33.controller;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.BandeiraCartao;
import br.com.rpm33.model.Cartao;
import br.com.rpm33.model.Cidade;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.Endereco;
import br.com.rpm33.model.Estado;
import br.com.rpm33.model.Genero;
import br.com.rpm33.model.Telefone;
import br.com.rpm33.model.TipoTelefone;
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
  private final EntityManager entityManager;

  public DevController(IFachada fachada, EntityManager entityManager) {
    this.fachada = fachada;
    this.entityManager = entityManager;
  }

  @PostMapping("/reset")
  @Transactional
  public ResponseEntity<Object> reset() {
    entityManager.createNativeQuery("TRUNCATE cliente, log RESTART IDENTITY CASCADE")
        .executeUpdate();
    entityManager.createNativeQuery("ALTER SEQUENCE seq_codigo_cliente RESTART WITH 1")
        .executeUpdate();

    List<String> falhas = new ArrayList<>();
    inserir(anaPaula(), 5, falhas);
    inserir(brunoTavares(), 3, falhas);
    inserir(carlaNogueira(), 1, falhas);

    if (!falhas.isEmpty()) {
      return ResponseEntity.internalServerError().body(falhas);
    }
    return ResponseEntity.ok(List.of("CLI-000001", "CLI-000002", "CLI-000003"));
  }

  private void inserir(Cliente cliente, int ranking, List<String> falhas) {
    Resultado resultado = fachada.inserir(cliente);
    if (resultado.temErro()) {
      falhas.addAll(resultado.getMensagens());
      return;
    }
    Cliente salvo = (Cliente) resultado.primeira();
    if (!Boolean.TRUE.equals(cliente.getIsAtivo())) {
      salvo.setIsAtivo(false);
    }
    salvo.setRanking(ranking);
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
