package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.repository.BandeiraCartaoRepository;
import br.com.rpm33.repository.EstadoRepository;
import br.com.rpm33.repository.GeneroRepository;
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

  public DominioController(GeneroRepository generoRepository,
      TipoTelefoneRepository tipoTelefoneRepository,
      BandeiraCartaoRepository bandeiraCartaoRepository, EstadoRepository estadoRepository) {
    this.generoRepository = generoRepository;
    this.tipoTelefoneRepository = tipoTelefoneRepository;
    this.bandeiraCartaoRepository = bandeiraCartaoRepository;
    this.estadoRepository = estadoRepository;
  }

  @GetMapping
  public Map<String, Object> listar() {
    Sort porDescricao = Sort.by("desc");
    return Map.of(
        "generos", generoRepository.findAll(Sort.by("id")),
        "tiposTelefone", tipoTelefoneRepository.findAll(Sort.by("id")),
        "bandeiras", bandeiraCartaoRepository.findAll(porDescricao),
        "estados", estadoRepository.findAll(porDescricao));
  }
}
