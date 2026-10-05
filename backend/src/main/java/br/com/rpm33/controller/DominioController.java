package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.repository.BandeiraCartaoRepository;
import br.com.rpm33.repository.CategoriaRepository;
import br.com.rpm33.repository.CategoriaStatusRepository;
import br.com.rpm33.repository.EdicaoRepository;
import br.com.rpm33.repository.EstadoRepository;
import br.com.rpm33.repository.FormatoRepository;
import br.com.rpm33.repository.FornecedorRepository;
import br.com.rpm33.repository.GeneroRepository;
import br.com.rpm33.repository.GrupoPrecificacaoRepository;
import br.com.rpm33.repository.TipoTelefoneRepository;

/**
 * RNF0013: as tabelas de domínio carregadas pelo script de implantação. São listas
 * de consulta, não entidades de domínio, e por isso não passam pela Fachada.
 */
@RestController
@RequestMapping("/api/dominios")
public class DominioController {

  private final GeneroRepository generoRepository;
  private final TipoTelefoneRepository tipoTelefoneRepository;
  private final BandeiraCartaoRepository bandeiraCartaoRepository;
  private final EstadoRepository estadoRepository;
  private final FormatoRepository formatoRepository;
  private final EdicaoRepository edicaoRepository;
  private final GrupoPrecificacaoRepository grupoPrecificacaoRepository;
  private final FornecedorRepository fornecedorRepository;
  private final CategoriaRepository categoriaRepository;
  private final CategoriaStatusRepository categoriaStatusRepository;

  public DominioController(GeneroRepository generoRepository,
      TipoTelefoneRepository tipoTelefoneRepository,
      BandeiraCartaoRepository bandeiraCartaoRepository, EstadoRepository estadoRepository,
      FormatoRepository formatoRepository, EdicaoRepository edicaoRepository,
      GrupoPrecificacaoRepository grupoPrecificacaoRepository,
      FornecedorRepository fornecedorRepository, CategoriaRepository categoriaRepository,
      CategoriaStatusRepository categoriaStatusRepository) {
    this.generoRepository = generoRepository;
    this.tipoTelefoneRepository = tipoTelefoneRepository;
    this.bandeiraCartaoRepository = bandeiraCartaoRepository;
    this.estadoRepository = estadoRepository;
    this.formatoRepository = formatoRepository;
    this.edicaoRepository = edicaoRepository;
    this.grupoPrecificacaoRepository = grupoPrecificacaoRepository;
    this.fornecedorRepository = fornecedorRepository;
    this.categoriaRepository = categoriaRepository;
    this.categoriaStatusRepository = categoriaStatusRepository;
  }

  /** "generos" é o gênero do cliente; o gênero musical do disco vem em "categorias". */
  @GetMapping
  public Map<String, Object> listar() {
    Sort porId = Sort.by("id");
    Sort porDescricao = Sort.by("desc");
    return Map.of(
        "generos", generoRepository.findAll(porId),
        "tiposTelefone", tipoTelefoneRepository.findAll(porId),
        "bandeiras", bandeiraCartaoRepository.findAll(porDescricao),
        "estados", estadoRepository.findAll(porDescricao),
        "formatos", formatoRepository.findAll(porId),
        "edicoes", edicaoRepository.findAll(porId),
        "grupos", grupoPrecificacaoRepository.findAll(porId),
        "fornecedores", fornecedorRepository.findAll(Sort.by("nome")),
        "categorias", categoriaRepository.findAll(
            Sort.by(Sort.Order.desc("tipo"), Sort.Order.asc("desc"))),
        "categoriasStatus", categoriaStatusRepository.findAll(porId));
  }
}
