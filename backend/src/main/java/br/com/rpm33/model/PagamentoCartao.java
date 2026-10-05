package br.com.rpm33.model;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonProperty.Access;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

/**
 * RN0034: quanto cada cartão pagou. Guarda bandeira, número e nome do cartão porque
 * o cartão usado só neste pedido não existe no perfil.
 */
@Entity
@Table(name = "pagamento_cartao")
public class PagamentoCartao {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "pedido_id")
  private Pedido pedido;

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "cartao_id")
  private Cartao cartao;

  /** Cartão do perfil; nulo quando o cartão foi usado só neste pedido ou saiu do perfil. */
  @Column(name = "cartao_id", insertable = false, updatable = false)
  private Long cartaoId;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "bandeira_cartao_id")
  private BandeiraCartao bandeira;

  @JsonIgnore
  @Column(length = 20)
  private String numero;

  @Column(name = "nome_impresso", length = 80)
  private String nomeImpresso;

  @Column(precision = 10, scale = 2)
  private BigDecimal valor;

  /** Cartão digitado no checkout, validado pela RN0024 e pela RN0025. */
  @Transient
  @JsonProperty(access = Access.WRITE_ONLY)
  private Cartao cartaoNovo;

  @Transient
  @JsonProperty(access = Access.WRITE_ONLY)
  private Boolean salvarNoPerfil;

  public String getFinalNumero() {
    return numero == null || numero.length() < 4 ? null : numero.substring(numero.length() - 4);
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Pedido getPedido() {
    return pedido;
  }

  public void setPedido(Pedido pedido) {
    this.pedido = pedido;
  }

  public Cartao getCartao() {
    return cartao;
  }

  public void setCartao(Cartao cartao) {
    this.cartao = cartao;
  }

  public Long getCartaoId() {
    return cartaoId;
  }

  public void setCartaoId(Long cartaoId) {
    this.cartaoId = cartaoId;
  }

  public BandeiraCartao getBandeira() {
    return bandeira;
  }

  public void setBandeira(BandeiraCartao bandeira) {
    this.bandeira = bandeira;
  }

  public String getNumero() {
    return numero;
  }

  public void setNumero(String numero) {
    this.numero = numero;
  }

  public String getNomeImpresso() {
    return nomeImpresso;
  }

  public void setNomeImpresso(String nomeImpresso) {
    this.nomeImpresso = nomeImpresso;
  }

  public BigDecimal getValor() {
    return valor;
  }

  public void setValor(BigDecimal valor) {
    this.valor = valor;
  }

  public Cartao getCartaoNovo() {
    return cartaoNovo;
  }

  public void setCartaoNovo(Cartao cartaoNovo) {
    this.cartaoNovo = cartaoNovo;
  }

  public Boolean getSalvarNoPerfil() {
    return salvarNoPerfil;
  }

  public void setSalvarNoPerfil(Boolean salvarNoPerfil) {
    this.salvarNoPerfil = salvarNoPerfil;
  }
}
