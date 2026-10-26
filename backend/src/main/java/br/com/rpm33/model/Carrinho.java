package br.com.rpm33.model;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonProperty.Access;

/**
 * RF0031, RN0044 e RNF0042: o carrinho do cliente como a loja mostra — os itens que
 * bloqueiam estoque, os que caíram pelo prazo e quanto falta para o prazo vencer.
 */
public class Carrinho extends EntidadeDominio {

  private Long clienteId;
  private List<ItemCarrinho> itens = new ArrayList<>();
  private List<ItemCarrinho> expirados = new ArrayList<>();
  /** Nulo com o carrinho vazio. Em segundos, para não depender do relógio do navegador. */
  private Long segundosParaExpirar;
  private Integer prazoMinutos;
  private Integer avisoMinutos;
  /** RN0032: o que a revalidação mudou, para a tela avisar o cliente. */
  private List<String> ajustes = new ArrayList<>();

  /** Na exclusão: só os itens expirados (RNF0042, "dispensar"), não o carrinho todo. */
  @JsonProperty(access = Access.WRITE_ONLY)
  private Boolean apenasExpirados;

  public Long getClienteId() {
    return clienteId;
  }

  public void setClienteId(Long clienteId) {
    this.clienteId = clienteId;
  }

  public List<ItemCarrinho> getItens() {
    return itens;
  }

  public void setItens(List<ItemCarrinho> itens) {
    this.itens = itens;
  }

  public List<ItemCarrinho> getExpirados() {
    return expirados;
  }

  public void setExpirados(List<ItemCarrinho> expirados) {
    this.expirados = expirados;
  }

  public Long getSegundosParaExpirar() {
    return segundosParaExpirar;
  }

  public void setSegundosParaExpirar(Long segundosParaExpirar) {
    this.segundosParaExpirar = segundosParaExpirar;
  }

  public Integer getPrazoMinutos() {
    return prazoMinutos;
  }

  public void setPrazoMinutos(Integer prazoMinutos) {
    this.prazoMinutos = prazoMinutos;
  }

  public Integer getAvisoMinutos() {
    return avisoMinutos;
  }

  public void setAvisoMinutos(Integer avisoMinutos) {
    this.avisoMinutos = avisoMinutos;
  }

  public List<String> getAjustes() {
    return ajustes;
  }

  public void setAjustes(List<String> ajustes) {
    this.ajustes = ajustes;
  }

  public Boolean getApenasExpirados() {
    return apenasExpirados;
  }

  public void setApenasExpirados(Boolean apenasExpirados) {
    this.apenasExpirados = apenasExpirados;
  }
}
