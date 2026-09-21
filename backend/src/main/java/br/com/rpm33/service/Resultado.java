package br.com.rpm33.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import br.com.rpm33.model.EntidadeDominio;

/** Retorno único das quatro operações: as entidades afetadas ou as mensagens de negócio. */
public class Resultado {

  private final List<EntidadeDominio> entidades = new ArrayList<>();
  private final List<String> mensagens = new ArrayList<>();

  public static Resultado com(EntidadeDominio... entidades) {
    Resultado resultado = new Resultado();
    resultado.entidades.addAll(Arrays.asList(entidades));
    return resultado;
  }

  public static Resultado de(List<? extends EntidadeDominio> entidades) {
    Resultado resultado = new Resultado();
    resultado.entidades.addAll(entidades);
    return resultado;
  }

  public static Resultado erro(List<String> mensagens) {
    Resultado resultado = new Resultado();
    resultado.mensagens.addAll(mensagens);
    return resultado;
  }

  public static Resultado erro(String mensagem) {
    return erro(List.of(mensagem));
  }

  public boolean temErro() {
    return !mensagens.isEmpty();
  }

  public EntidadeDominio primeira() {
    return entidades.isEmpty() ? null : entidades.get(0);
  }

  public List<EntidadeDominio> getEntidades() {
    return entidades;
  }

  public List<String> getMensagens() {
    return mensagens;
  }
}
