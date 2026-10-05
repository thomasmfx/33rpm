package br.com.rpm33.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

/** RN0011: os dados obrigatórios do cadastro, lidos como disco. */
@Entity
@Table(name = "disco")
public class Disco extends EntidadeDominio {

  /** RNF0021: código único, no formato DSC-000001. */
  @Column(length = 20)
  private String codigo;

  @Column(length = 160)
  private String titulo;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "artista_id")
  private Artista artista;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "gravadora_id")
  private Gravadora gravadora;

  @Column(name = "ano_lancamento")
  private LocalDate anoLancamento;

  /** RN0012: gêneros e estilos na mesma coleção, separados pelo tipo da categoria. */
  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(name = "disco_categoria", joinColumns = @JoinColumn(name = "disco_id"),
      inverseJoinColumns = @JoinColumn(name = "categoria_id"))
  @OrderBy("id")
  private Set<Categoria> categorias = new LinkedHashSet<>();

  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(name = "disco_edicao", joinColumns = @JoinColumn(name = "disco_id"),
      inverseJoinColumns = @JoinColumn(name = "edicao_id"))
  @OrderBy("id")
  private Set<Edicao> edicoes = new LinkedHashSet<>();

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "formato_id")
  private Formato formato;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "grupo_precificacao_id")
  private GrupoPrecificacao grupoPrecificacao;

  @Column(name = "codigo_catalogo", length = 40)
  private String codigoCatalogo;

  @Column(name = "codigo_barras", length = 20)
  private String codigoBarras;

  @Column(name = "numero_faixas")
  private Integer numeroFaixas;

  @Column(length = 8)
  private String duracao;

  @Column(columnDefinition = "text")
  private String descricao;

  @Column(precision = 5, scale = 2)
  private BigDecimal altura;

  @Column(precision = 5, scale = 2)
  private BigDecimal largura;

  @Column(precision = 5, scale = 2)
  private BigDecimal profundidade;

  /** Em gramas; é o peso que entra no frete (RF0034). */
  private Integer peso;

  @Column(name = "capa_url", length = 500)
  private String capaUrl;

  @Column(name = "capa_miniatura_url", length = 500)
  private String capaMiniaturaUrl;

  @Column(name = "preco_venda", precision = 10, scale = 2)
  private BigDecimal precoVenda;

  /** RN0014: quem autorizou o preço abaixo da margem do grupo. */
  @Column(name = "autorizacao_gerente", length = 120)
  private String autorizacaoGerente;

  private Integer estoque;

  @Column(name = "is_ativo")
  private Boolean isAtivo;

  /** RF0052: maior custo registrado mais a margem do grupo; não existe antes da 1ª entrada. */
  @Transient
  private BigDecimal precoSugerido;

  /**
   * Na resposta, o último registro de RN0015/RN0017; na requisição de inativação ou
   * de ativação, a categoria e a justificativa da mudança.
   */
  @Transient
  private MotivoStatus motivoStatus;

  /** RF0013: data do pedido mais recente com o disco. */
  @Transient
  private LocalDate ultimaVendaEm;

  public String getCodigo() {
    return codigo;
  }

  public void setCodigo(String codigo) {
    this.codigo = codigo;
  }

  public String getTitulo() {
    return titulo;
  }

  public void setTitulo(String titulo) {
    this.titulo = titulo;
  }

  public Artista getArtista() {
    return artista;
  }

  public void setArtista(Artista artista) {
    this.artista = artista;
  }

  public Gravadora getGravadora() {
    return gravadora;
  }

  public void setGravadora(Gravadora gravadora) {
    this.gravadora = gravadora;
  }

  public LocalDate getAnoLancamento() {
    return anoLancamento;
  }

  public void setAnoLancamento(LocalDate anoLancamento) {
    this.anoLancamento = anoLancamento;
  }

  public Set<Categoria> getCategorias() {
    return categorias;
  }

  public void setCategorias(Set<Categoria> categorias) {
    this.categorias = categorias;
  }

  public Set<Edicao> getEdicoes() {
    return edicoes;
  }

  public void setEdicoes(Set<Edicao> edicoes) {
    this.edicoes = edicoes;
  }

  public Formato getFormato() {
    return formato;
  }

  public void setFormato(Formato formato) {
    this.formato = formato;
  }

  public GrupoPrecificacao getGrupoPrecificacao() {
    return grupoPrecificacao;
  }

  public void setGrupoPrecificacao(GrupoPrecificacao grupoPrecificacao) {
    this.grupoPrecificacao = grupoPrecificacao;
  }

  public String getCodigoCatalogo() {
    return codigoCatalogo;
  }

  public void setCodigoCatalogo(String codigoCatalogo) {
    this.codigoCatalogo = codigoCatalogo;
  }

  public String getCodigoBarras() {
    return codigoBarras;
  }

  public void setCodigoBarras(String codigoBarras) {
    this.codigoBarras = codigoBarras;
  }

  public Integer getNumeroFaixas() {
    return numeroFaixas;
  }

  public void setNumeroFaixas(Integer numeroFaixas) {
    this.numeroFaixas = numeroFaixas;
  }

  public String getDuracao() {
    return duracao;
  }

  public void setDuracao(String duracao) {
    this.duracao = duracao;
  }

  public String getDescricao() {
    return descricao;
  }

  public void setDescricao(String descricao) {
    this.descricao = descricao;
  }

  public BigDecimal getAltura() {
    return altura;
  }

  public void setAltura(BigDecimal altura) {
    this.altura = altura;
  }

  public BigDecimal getLargura() {
    return largura;
  }

  public void setLargura(BigDecimal largura) {
    this.largura = largura;
  }

  public BigDecimal getProfundidade() {
    return profundidade;
  }

  public void setProfundidade(BigDecimal profundidade) {
    this.profundidade = profundidade;
  }

  public Integer getPeso() {
    return peso;
  }

  public void setPeso(Integer peso) {
    this.peso = peso;
  }

  public String getCapaUrl() {
    return capaUrl;
  }

  public void setCapaUrl(String capaUrl) {
    this.capaUrl = capaUrl;
  }

  public String getCapaMiniaturaUrl() {
    return capaMiniaturaUrl;
  }

  public void setCapaMiniaturaUrl(String capaMiniaturaUrl) {
    this.capaMiniaturaUrl = capaMiniaturaUrl;
  }

  public BigDecimal getPrecoVenda() {
    return precoVenda;
  }

  public void setPrecoVenda(BigDecimal precoVenda) {
    this.precoVenda = precoVenda;
  }

  public String getAutorizacaoGerente() {
    return autorizacaoGerente;
  }

  public void setAutorizacaoGerente(String autorizacaoGerente) {
    this.autorizacaoGerente = autorizacaoGerente;
  }

  public Integer getEstoque() {
    return estoque;
  }

  public void setEstoque(Integer estoque) {
    this.estoque = estoque;
  }

  public Boolean getIsAtivo() {
    return isAtivo;
  }

  public void setIsAtivo(Boolean isAtivo) {
    this.isAtivo = isAtivo;
  }

  public BigDecimal getPrecoSugerido() {
    return precoSugerido;
  }

  public void setPrecoSugerido(BigDecimal precoSugerido) {
    this.precoSugerido = precoSugerido;
  }

  public MotivoStatus getMotivoStatus() {
    return motivoStatus;
  }

  public void setMotivoStatus(MotivoStatus motivoStatus) {
    this.motivoStatus = motivoStatus;
  }

  public LocalDate getUltimaVendaEm() {
    return ultimaVendaEm;
  }

  public void setUltimaVendaEm(LocalDate ultimaVendaEm) {
    this.ultimaVendaEm = ultimaVendaEm;
  }
}
