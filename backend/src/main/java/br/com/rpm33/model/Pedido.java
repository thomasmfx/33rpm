package br.com.rpm33.model;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;

import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonProperty.Access;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import tools.jackson.databind.annotation.JsonDeserialize;

/**
 * RF0033 a RF0038. O mesmo corpo serve à cotação do checkout e à gravação; o que só
 * existe na requisição (endereço e cartões novos) fica em campos transientes.
 */
@Entity
@Table(name = "pedido")
@AttributeOverride(name = "dataCadastro",
    column = @Column(name = "data", insertable = false, updatable = false))
public class Pedido extends EntidadeDominio {

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "cliente_id")
  private Cliente cliente;

  @Column(name = "cliente_id", insertable = false, updatable = false)
  private Long clienteId;

  /** Endereço do perfil usado na compra; vira nulo se sair do perfil, e o snapshot fica. */
  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "endereco_id")
  private Endereco endereco;

  @Column(name = "endereco_id", insertable = false, updatable = false)
  private Long enderecoId;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "status_pedido_id")
  private StatusPedido status;

  @Column(precision = 10, scale = 2)
  private BigDecimal subtotal;

  @Column(precision = 10, scale = 2)
  private BigDecimal frete;

  @Column(precision = 10, scale = 2)
  private BigDecimal total;

  @Embedded
  private EnderecoEntrega enderecoEntrega;

  // FetchMode.SELECT: as três coleções num join só multiplicariam as linhas entre si
  @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true,
      fetch = FetchType.EAGER)
  @Fetch(FetchMode.SELECT)
  @OrderBy("id")
  @JsonDeserialize(as = LinkedHashSet.class)
  private Set<ItemPedido> itens = new LinkedHashSet<>();

  @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true,
      fetch = FetchType.EAGER)
  @Fetch(FetchMode.SELECT)
  @OrderBy("id")
  @JsonDeserialize(as = LinkedHashSet.class)
  private Set<PagamentoCartao> pagamentos = new LinkedHashSet<>();

  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(name = "pedido_cupom", joinColumns = @JoinColumn(name = "pedido_id"),
      inverseJoinColumns = @JoinColumn(name = "cupom_id"))
  @Fetch(FetchMode.SELECT)
  @OrderBy("id")
  @JsonDeserialize(as = LinkedHashSet.class)
  private Set<Cupom> cupons = new LinkedHashSet<>();

  /** Endereço digitado no checkout, no formato do cadastro do cliente (RN0023). */
  @Transient
  @JsonProperty(access = Access.WRITE_ONLY)
  private Endereco enderecoNovo;

  @Transient
  @JsonProperty(access = Access.WRITE_ONLY)
  private Boolean salvarEnderecoNoPerfil;

  /** RN0036: cupom de troca com o que os cupons passaram do total. */
  @Transient
  private Cupom cupomGerado;

  public Cliente getCliente() {
    return cliente;
  }

  public void setCliente(Cliente cliente) {
    this.cliente = cliente;
  }

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }

  public Endereco getEndereco() {
    return endereco;
  }

  public void setEndereco(Endereco endereco) {
    this.endereco = endereco;
  }

  public Long getEnderecoId() {
    return enderecoId;
  }

  public void setEnderecoId(Long enderecoId) {
    this.enderecoId = enderecoId;
  }

  public StatusPedido getStatus() {
    return status;
  }

  public void setStatus(StatusPedido status) {
    this.status = status;
  }

  public BigDecimal getSubtotal() {
    return subtotal;
  }

  public void setSubtotal(BigDecimal subtotal) {
    this.subtotal = subtotal;
  }

  public BigDecimal getFrete() {
    return frete;
  }

  public void setFrete(BigDecimal frete) {
    this.frete = frete;
  }

  public BigDecimal getTotal() {
    return total;
  }

  public void setTotal(BigDecimal total) {
    this.total = total;
  }

  public EnderecoEntrega getEnderecoEntrega() {
    return enderecoEntrega;
  }

  public void setEnderecoEntrega(EnderecoEntrega enderecoEntrega) {
    this.enderecoEntrega = enderecoEntrega;
  }

  public Set<ItemPedido> getItens() {
    return itens;
  }

  public void setItens(Set<ItemPedido> itens) {
    this.itens = itens;
  }

  public Set<PagamentoCartao> getPagamentos() {
    return pagamentos;
  }

  public void setPagamentos(Set<PagamentoCartao> pagamentos) {
    this.pagamentos = pagamentos;
  }

  public Set<Cupom> getCupons() {
    return cupons;
  }

  public void setCupons(Set<Cupom> cupons) {
    this.cupons = cupons;
  }

  public Endereco getEnderecoNovo() {
    return enderecoNovo;
  }

  public void setEnderecoNovo(Endereco enderecoNovo) {
    this.enderecoNovo = enderecoNovo;
  }

  public Boolean getSalvarEnderecoNoPerfil() {
    return salvarEnderecoNoPerfil;
  }

  public void setSalvarEnderecoNoPerfil(Boolean salvarEnderecoNoPerfil) {
    this.salvarEnderecoNoPerfil = salvarEnderecoNoPerfil;
  }

  public Cupom getCupomGerado() {
    return cupomGerado;
  }

  public void setCupomGerado(Cupom cupomGerado) {
    this.cupomGerado = cupomGerado;
  }
}
