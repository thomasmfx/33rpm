package br.com.rpm33.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;

/**
 * RF0055: o período e as categorias da consulta de vendas. O resultado volta no mesmo
 * objeto: os meses do período e uma série por categoria, alinhada a eles.
 */
public class AnaliseVendas extends EntidadeDominio {

  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
  private LocalDate inicio;

  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
  private LocalDate fim;

  private List<String> categorias = new ArrayList<>();

  /** Meses no formato yyyy-MM, do início ao fim, sem buracos (RN0073). */
  private List<String> meses = new ArrayList<>();

  private List<SerieVendas> series = new ArrayList<>();

  @Override
  public String getNomeEntidade() {
    return "Analise";
  }

  public LocalDate getInicio() {
    return inicio;
  }

  public void setInicio(LocalDate inicio) {
    this.inicio = inicio;
  }

  public LocalDate getFim() {
    return fim;
  }

  public void setFim(LocalDate fim) {
    this.fim = fim;
  }

  public List<String> getCategorias() {
    return categorias;
  }

  public void setCategorias(List<String> categorias) {
    this.categorias = categorias;
  }

  public List<String> getMeses() {
    return meses;
  }

  public void setMeses(List<String> meses) {
    this.meses = meses;
  }

  public List<SerieVendas> getSeries() {
    return series;
  }

  public void setSeries(List<SerieVendas> series) {
    this.series = series;
  }
}
