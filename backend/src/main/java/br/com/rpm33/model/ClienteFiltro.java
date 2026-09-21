package br.com.rpm33.model;

/**
 * RF0024: filtro de consulta de clientes. Não é entidade persistente — trafega
 * pela Fachada como qualquer EntidadeDominio e é resolvido pelo ClienteService.
 */
public class ClienteFiltro extends EntidadeDominio {

  public static final String TODOS = "todos";
  public static final String ATIVOS = "ativos";
  public static final String INATIVOS = "inativos";

  private String nome;
  private String email;
  private String telefone;
  private String cpf;
  private String codigo;
  private String status = TODOS;
  private Integer rankingMinimo;

  @Override
  public String getNomeEntidade() {
    return Cliente.class.getSimpleName();
  }

  public String getNome() {
    return nome;
  }

  public void setNome(String nome) {
    this.nome = nome;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getTelefone() {
    return telefone;
  }

  public void setTelefone(String telefone) {
    this.telefone = telefone;
  }

  public String getCpf() {
    return cpf;
  }

  public void setCpf(String cpf) {
    this.cpf = cpf;
  }

  public String getCodigo() {
    return codigo;
  }

  public void setCodigo(String codigo) {
    this.codigo = codigo;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Integer getRankingMinimo() {
    return rankingMinimo;
  }

  public void setRankingMinimo(Integer rankingMinimo) {
    this.rankingMinimo = rankingMinimo;
  }
}
