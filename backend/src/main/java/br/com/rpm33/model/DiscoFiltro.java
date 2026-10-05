package br.com.rpm33.model;

import java.math.BigDecimal;

/**
 * RF0015: filtro de consulta de discos. Não é entidade persistente — trafega pela
 * Fachada como qualquer EntidadeDominio e é resolvido pelo DiscoService.
 */
public class DiscoFiltro extends EntidadeDominio {

  public static final String TODOS = "todos";
  public static final String ATIVOS = "ativos";
  public static final String INATIVOS = "inativos";
  public static final String DISPONIVEL = "disponivel";
  public static final String ESGOTADO = "esgotado";

  private String titulo;
  private String artista;
  private String gravadora;
  private String categoria;
  /** Casa o código DSC, o de catálogo ou o de barras. */
  private String codigo;
  private Integer anoMin;
  private Integer anoMax;
  private BigDecimal precoMin;
  private BigDecimal precoMax;
  private String grupo;
  private String formato;
  private String status = TODOS;
  private String estoque = TODOS;

  @Override
  public String getNomeEntidade() {
    return Disco.class.getSimpleName();
  }

  public String getTitulo() {
    return titulo;
  }

  public void setTitulo(String titulo) {
    this.titulo = titulo;
  }

  public String getArtista() {
    return artista;
  }

  public void setArtista(String artista) {
    this.artista = artista;
  }

  public String getGravadora() {
    return gravadora;
  }

  public void setGravadora(String gravadora) {
    this.gravadora = gravadora;
  }

  public String getCategoria() {
    return categoria;
  }

  public void setCategoria(String categoria) {
    this.categoria = categoria;
  }

  public String getCodigo() {
    return codigo;
  }

  public void setCodigo(String codigo) {
    this.codigo = codigo;
  }

  public Integer getAnoMin() {
    return anoMin;
  }

  public void setAnoMin(Integer anoMin) {
    this.anoMin = anoMin;
  }

  public Integer getAnoMax() {
    return anoMax;
  }

  public void setAnoMax(Integer anoMax) {
    this.anoMax = anoMax;
  }

  public BigDecimal getPrecoMin() {
    return precoMin;
  }

  public void setPrecoMin(BigDecimal precoMin) {
    this.precoMin = precoMin;
  }

  public BigDecimal getPrecoMax() {
    return precoMax;
  }

  public void setPrecoMax(BigDecimal precoMax) {
    this.precoMax = precoMax;
  }

  public String getGrupo() {
    return grupo;
  }

  public void setGrupo(String grupo) {
    this.grupo = grupo;
  }

  public String getFormato() {
    return formato;
  }

  public void setFormato(String formato) {
    this.formato = formato;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getEstoque() {
    return estoque;
  }

  public void setEstoque(String estoque) {
    this.estoque = estoque;
  }
}
